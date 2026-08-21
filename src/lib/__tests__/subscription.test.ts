import Purchases, { PACKAGE_TYPE } from "react-native-purchases";

/**
 * The billing seam is the only code path that takes money, so these cover the
 * cases that are expensive to get wrong: mapping store packages to our plan
 * enum, reading entitlement off the right identifier, and treating a dismissed
 * purchase sheet as "nothing happened" rather than an error.
 */

const mockPurchases = Purchases as unknown as {
  getOfferings: jest.Mock;
  purchasePackage: jest.Mock;
  restorePurchases: jest.Mock;
  getCustomerInfo: jest.Mock;
};

function pkg(identifier: string, packageType: string) {
  return {
    identifier,
    packageType,
    product: { identifier, priceString: "$14.99", introPrice: null },
  };
}

/** Re-imports the seam with a billing key present so the real adapter is used. */
function loadWithKey() {
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = "appl_test_key";
  let mod!: typeof import("../subscription");
  jest.isolateModules(() => {
    mod = require("../subscription");
  });
  return mod;
}

describe("subscription billing seam", () => {
  const original = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = { ...original };
  });

  it("maps monthly and annual store packages onto our plan enum", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY),
          pkg("thrivo_premium_annual", PACKAGE_TYPE.ANNUAL),
        ],
      },
    });

    const products = await loadWithKey().subscription.getProducts();

    expect(products).toEqual([
      expect.objectContaining({ id: "thrivo_premium_monthly", plan: "monthly" }),
      expect.objectContaining({ id: "thrivo_premium_annual", plan: "annual" }),
    ]);
  });

  it("hides packages it cannot map to a plan the backend understands", async () => {
    // A lifetime purchase we cannot record would strand the user's money.
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_lifetime", PACKAGE_TYPE.LIFETIME)] },
    });

    expect(await loadWithKey().subscription.getProducts()).toEqual([]);
  });

  it("reports a completed purchase as premium when the entitlement is active", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY)] },
    });
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: { entitlements: { active: { premium: {} } } },
    });

    const result = await loadWithKey().subscription.purchase("thrivo_premium_monthly");

    expect(result).toEqual({ entitlement: "premium", completed: true });
  });

  it("treats a dismissed purchase sheet as incomplete, not an error", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY)] },
    });
    mockPurchases.purchasePackage.mockRejectedValue({ userCancelled: true });

    const result = await loadWithKey().subscription.purchase("thrivo_premium_monthly");

    expect(result).toEqual({ entitlement: "free", completed: false });
  });

  it("rethrows real purchase failures so they are not silently swallowed", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY)] },
    });
    mockPurchases.purchasePackage.mockRejectedValue({
      userCancelled: false,
      message: "Store unavailable",
    });

    await expect(loadWithKey().subscription.purchase("thrivo_premium_monthly")).rejects.toEqual(
      expect.objectContaining({ message: "Store unavailable" })
    );
  });

  it("restores premium from an existing store receipt", async () => {
    mockPurchases.restorePurchases.mockResolvedValue({
      entitlements: { active: { premium: {} } },
    });

    expect(await loadWithKey().subscription.restore()).toEqual({ entitlement: "premium" });
  });

  it("reports free when the restored receipt carries no premium entitlement", async () => {
    mockPurchases.restorePurchases.mockResolvedValue({ entitlements: { active: {} } });

    expect(await loadWithKey().subscription.restore()).toEqual({ entitlement: "free" });
  });

  it("runs as a no-op without a billing key so development still boots", async () => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    let mod!: typeof import("../subscription");
    jest.isolateModules(() => {
      mod = require("../subscription");
    });

    expect(mod.isBillingConfigured()).toBe(false);
    expect(await mod.subscription.getProducts()).toEqual([]);
    expect(await mod.subscription.purchase("anything")).toEqual({
      entitlement: "free",
      completed: false,
    });
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });
});
