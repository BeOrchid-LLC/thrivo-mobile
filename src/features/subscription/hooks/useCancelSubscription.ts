import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Linking, Platform } from "react-native";
import type { CancelSubscriptionPayload } from "@/contracts";
import { analytics, isBillingConfigured, subscription as billing } from "@/lib";
import { cancelSubscription } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

/** Store-wide subscription settings, used when RevenueCat has no direct link. */
const STORE_SUBSCRIPTIONS_URL = Platform.select({
  ios: "https://apps.apple.com/account/subscriptions",
  android: "https://play.google.com/store/account/subscriptions",
  default: "https://apps.apple.com/account/subscriptions",
});

/**
 * Cancels premium.
 *
 * Neither store lets an app cancel a subscription on the user's behalf — it must
 * happen in the store's own subscription settings — so with billing configured
 * this opens that page and lets the webhook report the outcome. We deliberately
 * do **not** mark the backend cancelled here: the user may back out on the store
 * screen, and showing "cancelled" for a subscription that still renews is worse
 * than showing nothing. Entitlement is refreshed from the server on return.
 *
 * Without billing configured (development) it falls back to the backend endpoint
 * so the flow stays testable without store credentials.
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CancelSubscriptionPayload = {}) => {
      analytics.track(
        "thrivo.subscription_cancelled",
        payload.reason ? { reason: payload.reason } : undefined
      );

      if (!isBillingConfigured()) {
        const response = await cancelSubscription(payload);
        return { openedStore: false as const, response };
      }

      const managementUrl = (await billing.getManagementUrl()) ?? STORE_SUBSCRIPTIONS_URL;
      await Linking.openURL(managementUrl);
      return { openedStore: true as const };
    },
    onSuccess: (result) => {
      if (result.response) {
        syncSubscriptionCaches(queryClient, result.response);
        return;
      }
      // The user is now in the store. Re-read when they come back rather than
      // assuming they went through with it.
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
