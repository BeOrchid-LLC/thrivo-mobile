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
 * differs only in which event it reports and which endpoint it mirrors to.
 *
 * Trial eligibility is decided by the store, not by us: a user who already
 * consumed the intro offer is simply charged full price, which is why the
 * backend's `trialUsed` flag must never be treated as authoritative for billing.
 */
export function useStartTrial() {
  const purchase = usePurchaseSubscription();
  const mutation = purchase as any as typeof purchase & {
    mutate: (variables: StartTrialVariables, options?: unknown) => void;
    mutateAsync: (variables: StartTrialVariables) => ReturnType<typeof purchase.mutateAsync>;
  };
  mutation.mutate = (variables, options) =>
    purchase.mutate(
      { plan: (variables as any).plan, packageId: (variables as any).productId, isTrial: true },
      options as never
    );
  mutation.mutateAsync = (variables) =>
    purchase.mutateAsync({
      plan: (variables as any).plan,
      packageId: (variables as any).productId,
      isTrial: true,
    });
  return mutation;
}
