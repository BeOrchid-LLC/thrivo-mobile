import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscription as billing } from "@/lib";

/**
 * Re-applies purchases already made with this store account.
 *
 * Required by App Store review whenever an app sells a non-consumable or
 * subscription, and it is what makes the PRD's "restore on a second device"
 * acceptance criterion pass: RevenueCat matches the store receipt to the
 * `appUserID` we set at sign-in and re-grants the entitlement.
 *
 * The returned entitlement is informational — the caller should refresh from the
 * backend, which stays the source of truth.
 */
export function useRestorePurchases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billing.restore(),
    onSuccess: () => {
      // RevenueCat's webhook updates the backend; re-read rather than guess.
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
