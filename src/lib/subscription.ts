import type { Entitlement } from "@/contracts";

/**
 * In-app purchase seam (RevenueCat — MOBILE_ARCHITECTURE §1). Stubbed behind an
 * interface so the paywall/subscription feature can be built now; the real SDK
 * (needs API keys + store products) swaps in later. The backend remains the
 * source of truth for entitlement via webhooks — this only drives the purchase UX.
 */
export interface SubscriptionProduct {
  id: string;
  priceLabel: string;
}

export interface PurchaseResult {
  entitlement: Entitlement;
  /** False when the user cancelled the native purchase sheet. */
  completed: boolean;
}

export interface SubscriptionAdapter {
  configure: (userId: string) => Promise<void>;
  getProducts: () => Promise<SubscriptionProduct[]>;
  purchase: (productId: string) => Promise<PurchaseResult>;
  restore: () => Promise<{ entitlement: Entitlement }>;
}

const stubAdapter: SubscriptionAdapter = {
  configure: async (userId) => {
    if (__DEV__) console.info("[subscription] configure (stub)", userId);
  },
  getProducts: async () => [{ id: "thrivo_premium_monthly", priceLabel: "$14.99/mo" }],
  purchase: async (productId) => {
    if (__DEV__) console.info("[subscription] purchase (stub)", productId);
    return { entitlement: "free", completed: false };
  },
  restore: async () => ({ entitlement: "free" }),
};

export const subscription: SubscriptionAdapter = stubAdapter;
