import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { env } from "@/config/env";
import type { Entitlement, SubscriptionPlan } from "@/contracts";

export interface SubscriptionProduct {
  id: string;
  productId: string;
  priceLabel: string;
  periodLabel: string;
  currencyCode: string;
  plan: SubscriptionPlan;
  hasFreeTrial: boolean;
  trialLabel: string | null;
}

export interface PurchaseResult {
  entitlement: Entitlement;
  completed: boolean;
}

export interface SubscriptionAdapter {
  configure: (userId: string) => Promise<void>;
  getProducts: () => Promise<SubscriptionProduct[]>;
  purchase: (packageId: string) => Promise<PurchaseResult>;
  restore: () => Promise<{ entitlement: Entitlement }>;
  /** Compatibility no-op. Custom-ID-only apps switch users with logIn. */
  logOut: () => Promise<void>;
  getManagementUrl: () => Promise<string | null>;
  onEntitlementChange: (listener: (entitlement: Entitlement) => void) => () => void;
}

export const PREMIUM_ENTITLEMENT_ID = "Thrivo Premium";

export function isBillingConfigured(): boolean {
  return Boolean(env.revenueCatKey);
}

function planForPackage(pkg: PurchasesPackage): SubscriptionPlan | null {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "annual";
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "monthly";
  const hints = `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase();
  if (/annual|yearly|year/.test(hints)) return "annual";
  if (/monthly|month/.test(hints)) return "monthly";
  return null;
}

function entitlementFrom(activeIds: string[]): Entitlement {
  return activeIds.includes(PREMIUM_ENTITLEMENT_ID) ? "premium" : "free";
}

function isUserCancelled(error: unknown): boolean {
  return Boolean((error as { userCancelled?: boolean } | null)?.userCancelled);
}

type FreePhase = {
  price?: number | string;
  amountMicros?: number | string;
  cycles?: number;
  periodUnit?: string;
};

function isZeroPrice(value: FreePhase | null): boolean {
  if (!value) return false;
  return Number(value.amountMicros ?? value.price) === 0;
}

function trialLabel(value: FreePhase | null): string | null {
  if (!value || !isZeroPrice(value)) return null;
  const cycles = value.cycles ?? 1;
  const unit = (value.periodUnit ?? "period").toLowerCase();
  return `${cycles} ${unit}${cycles === 1 ? "" : "s"} free`;
}

function androidFreePhase(pkg: PurchasesPackage): FreePhase | null {
  const option = (pkg.product as unknown as { defaultOption?: { freePhase?: unknown } })
    .defaultOption;
  return (option?.freePhase as FreePhase | null) ?? null;
}

/**
 * The SDK installs a default log handler on `configure()` that routes its ERROR
 * level through `console.error`. In dev that turns ordinary outcomes — most
 * often the user tapping Cancel on the native purchase sheet — into a
 * full-screen LogBox error. Claiming the handler first keeps the SDK away from
 * `console.error`; real failures still surface through the thrown error that
 * `purchase()` and `restore()` propagate.
 */
function installLogHandler(): void {
  if (typeof Purchases.setLogHandler !== "function") return;
  Purchases.setLogHandler((_level: unknown, message: string) => {
    if (__DEV__) console.log(`[RevenueCat] ${message}`);
  });
}

let ready: Promise<void> | null = null;
let configuredUserId: string | null = null;
const packageCache = new Map<string, PurchasesPackage>();

async function ensureReady(): Promise<void> {
  if (ready) {
    await ready;
    return;
  }
  if (await Purchases.isConfigured()) return;
  throw new Error("RevenueCat has no identity yet — sign-in must complete first.");
}

async function findPackage(packageId: string): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  return (
    (offerings.current?.availablePackages ?? []).find(
      (pkg: PurchasesPackage) => pkg.identifier === packageId
    ) ?? null
  );
}

const revenueCatAdapter: SubscriptionAdapter = {
  configure: async (userId) => {
    const apiKey = env.revenueCatKey;
    if (!apiKey || configuredUserId === userId) return;
    const attempt = (async () => {
      installLogHandler();
      if (await Purchases.isConfigured()) await Purchases.logIn(userId);
      else {
        Purchases.configure({ apiKey, appUserID: userId });
        if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      configuredUserId = userId;
    })();
    ready = attempt.catch((error) => {
      ready = null;
      configuredUserId = null;
      throw error;
    });
    await ready;
  },

  getProducts: async () => {
    await ensureReady();
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    if (!offerings.current) throw new Error("no current offering configured");
    if (packages.length === 0) throw new Error("no available packages configured");
    const ids = packages.map((pkg: PurchasesPackage) => pkg.product.identifier);
    const eligibility =
      Platform.OS === "ios" &&
      typeof Purchases.checkTrialOrIntroductoryPriceEligibility === "function"
        ? await Purchases.checkTrialOrIntroductoryPriceEligibility(ids).catch(() => ({}))
        : {};

    return packages.flatMap((pkg: PurchasesPackage) => {
      const plan = planForPackage(pkg);
      if (!plan) return [];
      const intro = pkg.product.introPrice as unknown as FreePhase | null;
      const androidFree = Platform.OS === "android" ? androidFreePhase(pkg) : null;
      const eligibleStatus = Purchases.INTRO_ELIGIBILITY_STATUS?.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
      const iosEligible =
        Platform.OS === "ios" &&
        Boolean(eligibleStatus) &&
        eligibility[pkg.product.identifier]?.status === eligibleStatus;
      const freeOffer = Platform.OS === "ios" ? (iosEligible ? intro : null) : androidFree;
      packageCache.set(pkg.identifier, pkg);
      return [
        {
          id: pkg.identifier,
          productId: pkg.product.identifier,
          priceLabel: pkg.product.priceString,
          periodLabel: plan === "annual" ? "year" : "month",
          currencyCode: pkg.product.currencyCode,
          plan,
          hasFreeTrial: isZeroPrice(freeOffer),
          trialLabel: trialLabel(freeOffer),
        } satisfies SubscriptionProduct,
      ];
    });
  },

  purchase: async (packageId) => {
    await ensureReady();
    const pkg = packageCache.get(packageId) ?? (await findPackage(packageId));
    if (!pkg) throw new Error(`No store package for "${packageId}"`);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return {
        entitlement: entitlementFrom(Object.keys(customerInfo.entitlements.active)),
        completed: true,
      };
    } catch (error) {
      if (isUserCancelled(error)) return { entitlement: "free", completed: false };
      throw error;
    }
  },

  restore: async () => {
    await ensureReady();
    const customerInfo = await Purchases.restorePurchases();
    return { entitlement: entitlementFrom(Object.keys(customerInfo.entitlements.active)) };
  },

  logOut: async () => {},

  getManagementUrl: async () => {
    await ensureReady();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
  },

  onEntitlementChange: (listener) => {
    const handler = (customerInfo: CustomerInfo) => {
      listener(entitlementFrom(Object.keys(customerInfo.entitlements.active)));
    };
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => Purchases.removeCustomerInfoUpdateListener(handler);
  },
};

const noopAdapter: SubscriptionAdapter = {
  configure: async () => {},
  getProducts: async () => [],
  purchase: async () => ({ entitlement: "free", completed: false }),
  restore: async () => ({ entitlement: "free" }),
  logOut: async () => {},
  getManagementUrl: async () => null,
  onEntitlementChange: () => () => {},
};

export const subscription: SubscriptionAdapter = isBillingConfigured()
  ? revenueCatAdapter
  : noopAdapter;
