import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { SubscriptionPlan } from "@/contracts";
import { isBillingConfigured, subscription, type SubscriptionProduct } from "@/lib";
import { useIsAuthenticated } from "@/stores";

/**
 * Live store products (price, currency, and trial eligibility) straight from
 * RevenueCat. Prices must come from the store rather than being hardcoded —
 * Apple and Google localise them per storefront, and a mismatch between the
 * paywall and the purchase sheet is a review rejection.
 *
 * Gated on `isAuthenticated` as well as the key, because the SDK is configured
 * with the user id during session restore (`useSessionInit`). Querying before
 * that runs hits an unconfigured SDK and caches the failure.
 */
export function useOfferings() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: queryKeys.subscription.offerings(),
    queryFn: () => subscription.getProducts(),
    enabled: isBillingConfigured() && isAuthenticated,
    // Store metadata changes rarely, but it must not be trusted across launches:
    // the products depend on which API key the build was configured with, and a
    // stale list survives a key change. Re-fetch on mount and keep it short.
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    retry: 2,
  });
}

/**
 * Surfaces why the paywall has nothing to sell. React Query keeps failures in
 * query state rather than throwing them, so without this the screen just says
 * "unavailable" and the console stays silent.
 */
export function useOfferingsDiagnostics(query: ReturnType<typeof useOfferings>): void {
  const message = query.error instanceof Error ? query.error.message : null;

  useEffect(() => {
    if (__DEV__ && message) console.warn(`[subscription] offerings unavailable: ${message}`);
  }, [message]);
}

/** Picks the store product fulfilling a plan, or undefined when unavailable. */
export function productForPlan(
  products: SubscriptionProduct[] | undefined,
  plan: SubscriptionPlan
): SubscriptionProduct | undefined {
  return products?.find((product) => product.plan === plan);
}
