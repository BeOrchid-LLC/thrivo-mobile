import Purchases, { PACKAGE_TYPE } from "react-native-purchases";

/**
 * The billing seam is the only code path that takes money, so these cover the
 * cases that are expensive to get wrong: mapping store packages to our plan
 * enum, reading entitlement off the right identifier, and treating a dismissed
 * purchase sheet as "nothing happened" rather than an error.
 */

const mockPurchases = Purchases as unknown as {
  isConfigured: jest.Mock;
  configure: jest.Mock;
  logIn: jest.Mock;
  getOfferings: jest.Mock;
  purchasePackage: jest.Mock;
  restorePurchases: jest.Mock;
  getCustomerInfo: jest.Mock;
  setLogHandler: jest.Mock;
};

function pkg(identifier: string, packageType: string) {
  return {
    identifier,
    packageType,
    product: { identifier, price: 14.99, priceString: "$14.99", introPrice: null },
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

/** Loads the seam and gives the SDK an identity, as session restore does. */
async function loadConfigured() {
  const mod = loadWithKey();
  await mod.subscription.configure("user-1");
  return mod;
}

describe("subscription billing seam", () => {
  const original = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...original };
    mockPurchases.isConfigured.mockResolvedValue(false);
  });

  afterAll(() => {
    process.env = { ...original };
  });

  it("keeps SDK logs off console.error, so a cancelled sheet is not a red screen", async () => {
    // The SDK's own handler logs its ERROR level through console.error, which
    // LogBox turns into a full-screen error for something as ordinary as
    // dismissing the purchase sheet. We must claim the handler before configure.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    await loadConfigured();

    expect(mockPurchases.setLogHandler).toHaveBeenCalled();
    const [handler] = mockPurchases.setLogHandler.mock.calls[0];
    handler("ERROR", "\u{1F34E}\u203C\uFE0F Purchase was cancelled.");
    expect(consoleError).not.toHaveBeenCalled();

    jest.restoreAllMocks();
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

    const products = await (await loadConfigured()).subscription.getProducts();

    expect(products).toEqual([
      expect.objectContaining({ id: "thrivo_premium_monthly", plan: "monthly" }),
      expect.objectContaining({ id: "thrivo_premium_annual", plan: "annual" }),
    ]);
  });

  it("maps custom packages by identifier, so a Test Store offering still sells", async () => {
    // Packages created without the Monthly/Annual presets arrive as CUSTOM.
    // Dropping them would empty the paywall despite correct dashboard config.
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        identifier: "default",
        availablePackages: [
          pkg("monthly", PACKAGE_TYPE.CUSTOM),
          pkg("yearly", PACKAGE_TYPE.CUSTOM),
        ],
      },
    });

    const products = await (await loadConfigured()).subscription.getProducts();

    expect(products).toEqual([
      expect.objectContaining({ id: "monthly", plan: "monthly" }),
      expect.objectContaining({ id: "yearly", plan: "annual" }),
    ]);
  });

  it("hides packages it cannot map to a plan the backend understands", async () => {
    // A lifetime purchase we cannot record would strand the user's money.
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        identifier: "default",
        availablePackages: [
          pkg("thrivo_lifetime", PACKAGE_TYPE.LIFETIME),
          pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY),
        ],
      },
    });

    expect(await (await loadConfigured()).subscription.getProducts()).toEqual([
      expect.objectContaining({ id: "thrivo_premium_monthly", plan: "monthly" }),
    ]);
  });

  it("uses the already-configured native SDK after a JS reload wiped module state", async () => {
    // Fast Refresh resets this module but not the native SDK, and session
    // restore will not re-run configure() while the store is authenticated.
    mockPurchases.isConfigured.mockResolvedValue(true);
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        identifier: "default",
        availablePackages: [pkg("monthly", PACKAGE_TYPE.MONTHLY)],
      },
    });

    // No configure() call at all — exactly the post-reload state.
    expect(await loadWithKey().subscription.getProducts()).toHaveLength(1);
  });

  it("fails loudly before sign-in instead of resolving empty", async () => {
    // An empty success is cached and silently disables the paywall for the rest
    // of the session; an error lets the query retry once identity exists.
    await expect(loadWithKey().subscription.getProducts()).rejects.toThrow(/no identity yet/);
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  });

  it("waits for configure() rather than racing it", async () => {
    // Session restore fires configure() without awaiting it, so a paywall opened
    // immediately after sign-in must not fail with "not configured".
    const mod = loadWithKey();
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        identifier: "default",
        availablePackages: [pkg("monthly", PACKAGE_TYPE.MONTHLY)],
      },
    });

    const configuring = mod.subscription.configure("user-1");
    const products = mod.subscription.getProducts();

    await configuring;
    expect(await products).toHaveLength(1);
  });

  it("switches identity with logIn instead of configuring twice", async () => {
    // configure() is ignored on an already-configured SDK, which would leave the
    // previous user's entitlement attached on a shared device.
    const mod = loadWithKey();
    await mod.subscription.configure("user-1");

    mockPurchases.isConfigured.mockResolvedValue(true);
    await mod.subscription.configure("user-2");

    expect(mockPurchases.logIn).toHaveBeenCalledWith("user-2");
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });

  it("fails loudly when there is no current offering", async () => {
    mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });

    await expect((await loadConfigured()).subscription.getProducts()).rejects.toThrow(
      /no current offering/
    );
  });

  it("fails loudly when the current offering has no packages", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { identifier: "default", availablePackages: [] },
      all: { default: {} },
    });

    await expect((await loadConfigured()).subscription.getProducts()).rejects.toThrow(
      /no available packages/
    );
  });

  it("reports a completed purchase as premium when the entitlement is active", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY)] },
    });
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: { entitlements: { active: { "Thrivo Premium": {} } } },
    });

    const result = await (await loadConfigured()).subscription.purchase("thrivo_premium_monthly");

    expect(result).toEqual({ entitlement: "premium", completed: true });
  });

  it("treats a dismissed purchase sheet as incomplete, not an error", async () => {
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg("thrivo_premium_monthly", PACKAGE_TYPE.MONTHLY)] },
    });
    mockPurchases.purchasePackage.mockRejectedValue({ userCancelled: true });

    const result = await (await loadConfigured()).subscription.purchase("thrivo_premium_monthly");

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

    await expect(
      (await loadConfigured()).subscription.purchase("thrivo_premium_monthly")
    ).rejects.toEqual(expect.objectContaining({ message: "Store unavailable" }));
  });

  it("restores premium from an existing store receipt", async () => {
    mockPurchases.restorePurchases.mockResolvedValue({
      entitlements: { active: { "Thrivo Premium": {} } },
    });

    expect(await (await loadConfigured()).subscription.restore()).toEqual({
      entitlement: "premium",
    });
  });

  it("reports free when the restored receipt carries no premium entitlement", async () => {
    mockPurchases.restorePurchases.mockResolvedValue({ entitlements: { active: {} } });

    expect(await (await loadConfigured()).subscription.restore()).toEqual({ entitlement: "free" });
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
