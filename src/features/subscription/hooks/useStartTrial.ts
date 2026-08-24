import type { SubscriptionPlan } from "@/contracts";
import { usePurchaseSubscription } from "./usePurchaseSubscription";

export interface StartTrialVariables {
  plan: SubscriptionPlan;
  /** Store product id carrying the introductory offer. Absent when billing is off. */
  productId?: string;
}

/**
 * Starts the card-required trial. On the stores a trial is not a separate
 * transaction — it is the same subscription product bought with its
 * introductory offer attached, so this runs the identical purchase flow and
 * differs only in which event it reports.
 *
 * Trial eligibility is decided by the store, not by us: a user who already
 * consumed the intro offer is simply charged full price, which is why the
 * backend's `trialUsed` flag must never be treated as authoritative for billing.
 *
 * Returns a *new* object rather than reassigning `mutate` on the one
 * `usePurchaseSubscription` returned. Overwriting in place made the wrapper its
 * own target — `purchase.mutate` resolved to the replacement — so `mutate`
 * recursed instead of purchasing and no trial ever started.
 */
export function useStartTrial() {
  const purchase = usePurchaseSubscription();

  return {
    ...purchase,
    mutate: (
      variables: StartTrialVariables,
      options?: Parameters<typeof purchase.mutate>[1]
    ): void =>
      purchase.mutate(
        { plan: variables.plan, packageId: variables.productId, isTrial: true },
        options
      ),
    mutateAsync: (variables: StartTrialVariables) =>
      purchase.mutateAsync({
        plan: variables.plan,
        packageId: variables.productId,
        isTrial: true,
      }),
  };
}
