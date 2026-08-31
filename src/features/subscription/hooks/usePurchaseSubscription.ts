import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { SubscriptionPlan, SubscriptionResponse } from "@/contracts";
import { analytics, isBillingConfigured, monitoring, subscription as billing } from "@/lib";
import { queryKeys } from "@/api";
import { syncSubscription } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export interface PurchaseVariables {
  plan: SubscriptionPlan;
  /** RevenueCat package identifier from `useOfferings()`. */
  packageId?: string;
  /** Set when the purchase redeems a free trial, so the right event is emitted. */
  isTrial?: boolean;
}

/**
 * Buys the exact package shown by the store.
 *
 * The store — not our backend — is the authority on whether money moved. Once
 * it reports the entitlement granted, the purchase succeeded, and holding the
 * user on a spinner while our own projection catches up only delays news that
 * is already known. So the store's answer drives the UI immediately and the
 * backend reconciles behind it: a webhook has to arrive and be applied, which
 * routinely takes longer than anyone will wait, and previously surfaced as a
 * red "activation delayed" toast for a purchase that had plainly worked.
 */
/** Unattended reconciliation, ~4 minutes. Activation is usually late, not lost. */
const BACKGROUND_DELAYS_S = [2, 5, 10, 15, 30, 30, 60, 60, 60];

/**
 * Keeps asking after the blocking wait gives up.
 *
 * A store purchase can take longer to reach us than anyone will hold a spinner
 * for: the webhook has to arrive and the projection has to catch up. Stopping at
 * 30s left people staring at an error for a purchase that completed moments
 * later, with nothing re-checking until they happened to reopen the screen.
 * This writes the entitlement into the cache the moment it lands, so the app
 * unlocks itself.
 */
function confirmInBackground(queryClient: QueryClient): void {
  void (async () => {
    for (const seconds of BACKGROUND_DELAYS_S) {
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      try {
        const response = await syncSubscription();
        if (response.subscription.entitlement === "premium") {
          syncSubscriptionCaches(queryClient, response);
          return;
        }
      } catch {
        // Keep trying: a transient failure here must not end the follow-up.
      }
    }
  })();
}

/**
 * Reflects a store-granted purchase in the cache straight away.
 *
 * Deliberately narrow: only the fields the store itself just told us about.
 * Everything else — renewal date, price, product id — is left as-is for the
 * reconciliation to fill in, rather than invented here.
 */
function applyStorePurchase(
  queryClient: QueryClient,
  plan: SubscriptionPlan,
  isTrial: boolean
): void {
  queryClient.setQueryData<SubscriptionResponse>(queryKeys.subscription.me(), (previous) =>
    previous
      ? {
          ...previous,
          subscription: {
            ...previous.subscription,
            entitlement: "premium",
            status: isTrial ? "trialing" : "active",
            plan,
            cancelAtPeriodEnd: false,
          },
        }
      : previous
  );
}

export function usePurchaseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, packageId, isTrial = false }: PurchaseVariables) => {
      if (!isBillingConfigured()) throw new Error("Store billing is not available");
      if (!packageId) throw new Error(`No store package for the ${plan} plan`);
      const result = await billing.purchase(packageId);
      // The user dismissed the native sheet — not an error, just nothing to do.
      if (!result.completed) return { completed: false as const };

      analytics.track(isTrial ? "thrivo.trial_started" : "thrivo.subscription_started", {
        plan,
        packageId,
      });
      // The store granted the entitlement, so the purchase is done. Ask our
      // backend once in case it is already caught up — that gives the real row
      // (renewal date, price) rather than an assumed one — but never block on it.
      try {
        const response = await syncSubscription();
        if (response.subscription.entitlement === "premium") {
          return { completed: true as const, confirmed: true as const, response };
        }
      } catch (error) {
        if (__DEV__) console.warn("[sync] immediate check threw; reconciling later:", error);
        monitoring.captureException(error, { seam: "subscription-sync", plan, packageId });
      }
      // Not caught up yet. The store's word is enough to unlock the UI.
      return {
        completed: true as const,
        confirmed: result.entitlement === "premium",
        plan,
        isTrial,
      };
    },
    onSuccess: (result) => {
      if (!result.completed) return;
      if (result.response) {
        syncSubscriptionCaches(queryClient, result.response);
        return;
      }
      if (result.confirmed) {
        // Show what the store already granted, then let the webhook-driven row
        // replace it. Without this the plan card keeps showing the old plan
        // until the backend catches up, which reads as a purchase that failed.
        applyStorePurchase(queryClient, result.plan, result.isTrial);
      }
      confirmInBackground(queryClient);
    },
  });
}
