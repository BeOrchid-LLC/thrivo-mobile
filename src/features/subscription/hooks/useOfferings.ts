import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { SubscriptionPlan } from "@/contracts";
import { isBillingConfigured, subscription, type SubscriptionProduct } from "@/lib";

/**
 * Live store products (price, currency, and trial eligibility) straight from
 * RevenueCat. Prices must come from the store rather than being hardcoded —
 * Apple and Google localise them per storefront, and a mismatch between the
 * paywall and the purchase sheet is a review rejection.
 *
 * Resolves to an empty list when billing is not configured, so the paywall can
 * fall back to backend-supplied copy in development.
 */
export function useOfferings() {
  return useQuery({
    queryKey: queryKeys.subscription.offerings(),
    queryFn: () => subscription.getProducts(),
    enabled: isBillingConfigured(),
    // Store metadata changes rarely, and every call is a network round trip.
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

/** Picks the store product fulfilling a plan, or undefined when unavailable. */
export function productForPlan(
  products: SubscriptionProduct[] | undefined,
  plan: SubscriptionPlan
): SubscriptionProduct | undefined {
  return products?.find((product) => product.plan === plan);
}
