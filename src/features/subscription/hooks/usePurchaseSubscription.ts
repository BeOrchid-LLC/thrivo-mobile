import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured, monitoring, subscription as billing } from "@/lib";
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
 * Buys the exact package shown by the store, then waits for backend confirmation.
 *
 * Order matters: the store charges first, and only a completed purchase is
 * A purchase is not reported as successful until `/subscriptions/sync` returns
 * premium. Store completion without backend confirmation remains a retryable
 * delayed activation state.
 */
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
      let lastError: unknown;
      for (const seconds of [0, 1, 2, 4, 8, 15]) {
        if (seconds) await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        try {
          const response = await syncSubscription();
          if (response.subscription.entitlement === "premium") {
            return { completed: true as const, confirmed: true as const, response };
          }
        } catch (error) {
          lastError = error;
          monitoring.captureException(error, { seam: "subscription-sync", plan, packageId });
        }
      }
      return { completed: true as const, confirmed: false as const, error: lastError };
    },
    onSuccess: (result) => {
      if (!result.completed) return;
      if (result.response) {
        syncSubscriptionCaches(queryClient, result.response);
        return;
      }
      // The store accepted payment, but backend activation is delayed.
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
