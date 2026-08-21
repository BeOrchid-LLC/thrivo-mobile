import Purchases, { LOG_LEVEL, PACKAGE_TYPE, type PurchasesPackage } from "react-native-purchases";
import { env } from "@/config/env";
import type { Entitlement, SubscriptionPlan } from "@/contracts";

/**
 * In-app purchase seam (RevenueCat — MOBILE_ARCHITECTURE §1). Apple and Google
 * require store billing for mobile subscriptions, so this is the only path that
 * takes money; Stripe is web-only.
 *
 * **The backend stays the source of truth for entitlement.** RevenueCat notifies
 * it by webhook, and the app reads `GET /subscriptions/me` as before — this seam
 * only drives the purchase UX and reports what the store said. Feature code must
 * keep gating on `useEntitlement()`, never on a value returned from here.
 *
 * Without an SDK key (development, Expo Go, simulator) the no-op adapter runs so
 * the paywall still renders and the app still boots; a production build without a
 * key throws at bootstrap instead — see `src/config/env.ts`.
 */
export interface SubscriptionProduct {
  id: string;
  priceLabel: string;
  /** Which plan this product fulfils, so the UI can map it to the backend enum. */
  plan: SubscriptionPlan;
  /** True when the store offers an introductory/free-trial period on this product. */
  hasFreeTrial: boolean;
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
  /** Clears the store identity on sign-out so the next user starts clean. */
  logOut: () => Promise<void>;
  /** Deep link to the store's manage-subscriptions page, when one is available. */
  getManagementUrl: () => Promise<string | null>;
}

/**
 * The entitlement identifier configured in RevenueCat. Must match the dashboard
 * exactly — a typo reads as "not subscribed" rather than failing loudly.
 */
export const PREMIUM_ENTITLEMENT_ID = "premium";

/** True when the SDK is configured and calls are safe to make. */
export function isBillingConfigured(): boolean {
  return Boolean(env.revenueCatKey);
}

function planForPackage(pkg: PurchasesPackage): SubscriptionPlan | null {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "annual";
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "monthly";
  return null;
}

/**
 * RevenueCat models a purchase as a *package*, but our UI and backend talk in
 * product ids. Resolve back to the package so callers never handle SDK types.
 */
async function findPackage(productId: string): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return packages.find((pkg) => pkg.product.identifier === productId) ?? null;
}

function entitlementFrom(activeIds: string[]): Entitlement {
  return activeIds.includes(PREMIUM_ENTITLEMENT_ID) ? "premium" : "free";
}

/** RevenueCat reports a dismissed purchase sheet as an error, not a result. */
function isUserCancelled(error: unknown): boolean {
  return Boolean((error as { userCancelled?: boolean } | null)?.userCancelled);
}

const revenueCatAdapter: SubscriptionAdapter = {
  configure: async (userId) => {
    if (!env.revenueCatKey) return;
    // Identify by our own user id so entitlements follow the person across
    // devices and reinstalls — this is what makes "restore on a second device"
    // work without the user re-entering anything.
    Purchases.configure({ apiKey: env.revenueCatKey, appUserID: userId });
    if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  },

  getProducts: async () => {
    if (!env.revenueCatKey) return [];
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];

    return packages.reduce<SubscriptionProduct[]>((products, pkg) => {
      const plan = planForPackage(pkg);
      // Ignore lifetime/custom packages — the backend only models monthly and
      // annual, and showing a plan we cannot record would strand the purchase.
      if (!plan) return products;
      products.push({
        id: pkg.product.identifier,
        priceLabel: pkg.product.priceString,
        plan,
        hasFreeTrial: Boolean(pkg.product.introPrice),
      });
      return products;
    }, []);
  },

  purchase: async (productId) => {
    if (!env.revenueCatKey) return { entitlement: "free", completed: false };
    const pkg = await findPackage(productId);
    if (!pkg) throw new Error(`No store package for product "${productId}"`);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return {
        entitlement: entitlementFrom(Object.keys(customerInfo.entitlements.active)),
        completed: true,
      };
    } catch (error) {
      // A dismissed sheet is a normal outcome, not a failure to report.
      if (isUserCancelled(error)) return { entitlement: "free", completed: false };
      throw error;
    }
  },

  restore: async () => {
    if (!env.revenueCatKey) return { entitlement: "free" };
    const customerInfo = await Purchases.restorePurchases();
    return { entitlement: entitlementFrom(Object.keys(customerInfo.entitlements.active)) };
  },

  logOut: async () => {
    if (!env.revenueCatKey) return;
    await Purchases.logOut();
  },

  getManagementUrl: async () => {
    if (!env.revenueCatKey) return null;
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  },
};

const noopAdapter: SubscriptionAdapter = {
  configure: async (userId) => {
    if (__DEV__) console.info("[subscription] configure (no billing key)", userId);
  },
  getProducts: async () => [],
  purchase: async (productId) => {
    if (__DEV__) console.info("[subscription] purchase (no billing key)", productId);
    return { entitlement: "free", completed: false };
  },
  restore: async () => ({ entitlement: "free" }),
  logOut: async () => {},
  getManagementUrl: async () => null,
};

export const subscription: SubscriptionAdapter = isBillingConfigured()
  ? revenueCatAdapter
  : noopAdapter;
