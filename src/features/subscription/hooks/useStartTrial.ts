import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured, monitoring, subscription as billing } from "@/lib";
import { startTrial } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export interface StartTrialVariables {
  plan: SubscriptionPlan;
  /** Store product id carrying the introductory offer. Absent when billing is off. */
  productId?: string;
}

/**
 * Starts the card-required trial. On the stores a trial is not a separate
 * transaction — it is the same subscription product bought with its
 * introductory offer attached, so this runs the identical purchase flow and
 * differs only in which event it reports and which endpoint it mirrors to.
 *
 * Trial eligibility is decided by the store, not by us: a user who already
 * consumed the intro offer is simply charged full price, which is why the
 * backend's `trialUsed` flag must never be treated as authoritative for billing.
 */
export function useStartTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan, productId }: StartTrialVariables) => {
      // See usePurchaseSubscription — the no-billing path keeps development usable.
      if (!isBillingConfigured()) {
        const response = await startTrial({ plan });
        return { completed: true as const, response };
      }

      if (!productId) throw new Error(`No store product for the ${plan} plan`);
      const result = await billing.purchase(productId);
      if (!result.completed) return { completed: false as const };

      analytics.track("thrivo.trial_started", { plan, productId });

      try {
        const response = await startTrial({ plan });
        return { completed: true as const, response };
      } catch (error) {
        monitoring.captureException(error, { seam: "trial-mirror", plan, productId });
        return { completed: true as const };
      }
    },
    onSuccess: (result) => {
      if (!result.completed) return;
      if (result.response) {
        syncSubscriptionCaches(queryClient, result.response);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
