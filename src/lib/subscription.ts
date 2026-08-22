import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
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
  /**
   * Subscribes to live entitlement changes. Returns an unsubscribe function.
   *
   * The store — not the app — decides when a subscription renews, lapses, is
   * refunded, or is granted on another device. RevenueCat pushes those to the
   * SDK as they happen, so the app can react immediately instead of waiting for
   * the next poll and showing premium content the user no longer pays for.
   */
  onEntitlementChange: (listener: (entitlement: Entitlement) => void) => () => void;
}

/**
 * The entitlement identifier configured in RevenueCat, copied verbatim from
 * Product catalog → Entitlements.
 *
 * This must match the dashboard **exactly**, including spaces and capitals: a
 * mismatch is silent. RevenueCat returns the granted entitlements keyed by this
 * id, so the wrong value simply finds nothing and reports the user as free —
 * a completed, paid purchase that never unlocks anything.
 */
export const PREMIUM_ENTITLEMENT_ID = "Thrivo Premium";

/** True when the SDK is configured and calls are safe to make. */
export function isBillingConfigured(): boolean {
  return Boolean(env.revenueCatKey);
}

/**
 * Resolves a store package to the plan our backend understands.
 *
 * Prefers RevenueCat's predefined package types, but falls back to the package
 * and product identifiers: an offering can legitimately use *custom* packages
 * (common on the Test Store, and whenever someone names a package "yearly"
 * rather than picking the Annual preset), and those arrive as
 * `PACKAGE_TYPE.CUSTOM`. Dropping them would empty the paywall with no
 * explanation despite a correctly configured dashboard.
 */
function planForPackage(pkg: PurchasesPackage): SubscriptionPlan | null {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "annual";
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "monthly";

  const hints = `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase();
  if (/annual|yearly|year/.test(hints)) return "annual";
  if (/monthly|month/.test(hints)) return "monthly";

  // Lifetime and genuinely unrecognised packages stay excluded — selling a plan
  // the backend cannot record would strand the purchase.
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

/**
 * Resolves once the SDK has an identity. Session restore kicks `configure()` off
 * without awaiting it, so a paywall opened immediately after sign-in would
 * otherwise race the SDK and fail with "not configured" — burning its retries
 * before the SDK was ever ready.
 */
let ready: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (ready) {
    await ready;
    return;
  }

  // `ready` is JS state, but the SDK is native: it stays configured across JS
  // reloads and Fast Refresh, which reset this module. Session restore will not
  // re-run `configure()` in that case because the store is already
  // authenticated, so trusting `ready` alone would report "no identity" against
  // a perfectly working SDK. Ask the SDK itself.
  if (await Purchases.isConfigured()) return;

  // React Query swallows thrown errors into query state, so anything worth
  // diagnosing has to be logged here or it never reaches the console.
  if (__DEV__) console.warn("[subscription] no identity yet — sign-in has not completed.");
  throw new Error("RevenueCat has no identity yet — sign-in must complete first.");
}

const revenueCatAdapter: SubscriptionAdapter = {
  configure: async (userId) => {
    const apiKey = env.revenueCatKey;
    if (!apiKey) return;

    ready = (async () => {
      // The SDK can only be configured once per process. Calling configure()
      // again for a different user is ignored, which would leave the previous
      // user's identity — and their entitlement — attached on a shared device.
      // Switching users after that point is logIn()'s job.
      if (await Purchases.isConfigured()) {
        await Purchases.logIn(userId);
        return;
      }

      // Identify by our own user id so entitlements follow the person across
      // devices and reinstalls — this is what makes "restore on a second
      // device" work without the user re-entering anything.
      Purchases.configure({ apiKey, appUserID: userId });
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    })();

    await ready;
  },

  getProducts: async () => {
    if (!env.revenueCatKey) return [];
    await ensureReady();

    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];

    if (__DEV__) {
      console.info(
        `[subscription] offering "${offerings.current?.identifier ?? "none"}" returned ${packages.length} package(s):`,
        packages
          .map((p) => `${p.identifier}/${p.packageType}/${p.product.identifier}`)
          .join(", ") || "(none)"
      );
    }

    if (packages.length === 0) {
      // Treat this as a retryable failure rather than an empty catalogue. An
      // empty success is cached and silently disables the paywall for the rest
      // of the session, which is how a transient fetch looks like a config bug.
      const detail = offerings.current
        ? `offering "${offerings.current.identifier}" returned no available packages — check its packages have products attached for this store`
        : `no current offering (offerings seen: ${Object.keys(offerings.all).join(", ") || "none"}) — mark one as Current in RevenueCat and confirm the API key targets the right project`;
      if (__DEV__) console.warn(`[subscription] ${detail}`);
      throw new Error(`No purchasable packages: ${detail}.`);
    }

    const mapped = packages.reduce<SubscriptionProduct[]>((products, pkg) => {
      const plan = planForPackage(pkg);
      if (!plan) {
        if (__DEV__) {
          console.info(
            `[subscription] skipping package "${pkg.identifier}" (${pkg.packageType}) — not a monthly or annual plan.`
          );
        }
        return products;
      }
      products.push({
        id: pkg.product.identifier,
        priceLabel: pkg.product.priceString,
        plan,
        hasFreeTrial: Boolean(pkg.product.introPrice),
      });
      return products;
    }, []);

    if (__DEV__) {
      console.info(
        `[subscription] ${mapped.length} sellable product(s):`,
        mapped.map((p) => `${p.plan}=${p.id}@${p.priceLabel}`).join(", ") || "(none)"
      );
    }

    return mapped;
  },

  purchase: async (productId) => {
    if (!env.revenueCatKey) return { entitlement: "free", completed: false };
    await ensureReady();
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
    await ensureReady();
    const customerInfo = await Purchases.restorePurchases();
    return { entitlement: entitlementFrom(Object.keys(customerInfo.entitlements.active)) };
  },

  logOut: async () => {
    if (!env.revenueCatKey) return;
    // Nothing to sign out of if the SDK never got an identity.
    if (!ready || !(await Purchases.isConfigured())) return;
    ready = null;
    await Purchases.logOut();
  },

  getManagementUrl: async () => {
    if (!env.revenueCatKey) return null;
    await ensureReady();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  },

  onEntitlementChange: (listener) => {
    if (!env.revenueCatKey) return () => {};
    const handler = (customerInfo: CustomerInfo) => {
      listener(entitlementFrom(Object.keys(customerInfo.entitlements.active)));
    };
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => Purchases.removeCustomerInfoUpdateListener(handler);
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
  onEntitlementChange: () => () => {},
};

export const subscription: SubscriptionAdapter = isBillingConfigured()
  ? revenueCatAdapter
  : noopAdapter;
