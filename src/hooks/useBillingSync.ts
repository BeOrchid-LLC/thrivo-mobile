import { useEffect } from "react";
import { queryClient, queryKeys } from "@/api";
import { isBillingConfigured, monitoring, subscription } from "@/lib";
import { useIsAuthenticated } from "@/stores";

/**
 * Keeps entitlement in step with the store in real time.
 *
 * Purchases are not the only thing that changes what a user is entitled to. A
 * subscription renews, lapses, gets refunded, is upgraded, is bought on another
 * device, or is approved through Ask to Buy — all decided by the store, none of
 * them initiated in this app. RevenueCat pushes each of those to the SDK as it
 * happens.
 *
 * Without this the app only learns on the next poll, which means showing premium
 * content to someone whose subscription already ended, or withholding it from
 * someone who just paid on their iPad.
 *
 * The backend stays the source of truth: a change here triggers a re-read of
 * `GET /subscriptions/me` rather than flipping local state directly, so the
 * server (fed by RevenueCat's webhook) always has the final say.
 */
export function useBillingSync(): void {
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (!isAuthenticated || !isBillingConfigured()) return;

    try {
      return subscription.onEntitlementChange(() => {
        void queryClient.invalidateQueries({ queryKey: ["subscription"] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      });
    } catch (error) {
      // A missing listener must not take the app down — entitlement still
      // refreshes on the normal query cadence, just not instantly.
      monitoring.captureException(error, { seam: "billing-sync" });
      return undefined;
    }
  }, [isAuthenticated]);
}
