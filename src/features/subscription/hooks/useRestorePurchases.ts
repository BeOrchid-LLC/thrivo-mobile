import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscription as billing } from "@/lib";
import { syncSubscription } from "../api/subscription.api";

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
    mutationFn: async () => {
      const restored = await billing.restore();
      let response;
      for (const seconds of [0, 1, 2, 4, 8, 15]) {
        if (seconds) await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        response = await syncSubscription().catch(() => undefined);
        if (response?.subscription.entitlement === "premium") break;
      }
      return { ...restored, response };
    },
    onSuccess: (result) => {
      if (result.response) queryClient.setQueryData(["subscription"], result.response);
      else void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
