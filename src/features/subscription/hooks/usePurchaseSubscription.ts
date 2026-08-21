import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured, monitoring, subscription as billing } from "@/lib";
import { purchaseSubscription } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export interface PurchaseVariables {
  plan: SubscriptionPlan;
  /** Store product id from `useOfferings()`. Absent only when billing is off. */
  productId?: string;
  /** Set when the purchase redeems a free trial, so the right event is emitted. */
  isTrial?: boolean;
}

/**
 * Buys a plan through the store, then tells our backend about it.
 *
 * Order matters: the store charges first, and only a completed purchase is
 * mirrored. The mirror call is what keeps the admin dashboard and server-side
 * gating correct until RevenueCat's webhook lands — it is a convenience, not the
 * proof of purchase, so a mirror failure must not read as a failed purchase (the
 * user has already been charged). We surface it to monitoring and still refresh
 * from the server, which is the authority either way.
 */
export function usePurchaseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, productId, isTrial = false }: PurchaseVariables) => {
      // Development without store keys: keep the flow exercisable end to end by
      // recording the plan on the backend directly. No money moves either way.
      if (!isBillingConfigured()) {
        const response = await purchaseSubscription({ plan });
        return { completed: true as const, response };
      }

      if (!productId) throw new Error(`No store product for the ${plan} plan`);
      const result = await billing.purchase(productId);
      // The user dismissed the native sheet — not an error, just nothing to do.
      if (!result.completed) return { completed: false as const };

      analytics.track(isTrial ? "thrivo.trial_started" : "thrivo.subscription_started", {
        plan,
        productId,
      });

      try {
        const response = await purchaseSubscription({ plan });
        return { completed: true as const, response };
      } catch (error) {
        monitoring.captureException(error, {
          seam: "subscription-mirror",
          plan,
          productId,
        });
        return { completed: true as const };
      }
    },
    onSuccess: (result) => {
      if (!result.completed) return;
      if (result.response) {
        syncSubscriptionCaches(queryClient, result.response);
        return;
      }
      // Mirror failed: drop the cached value rather than showing a stale one.
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
