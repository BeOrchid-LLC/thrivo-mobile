/**
 * The env module validates `EXPO_PUBLIC_*` at import and throws on invalid config
 * (fail fast). These tests re-import it under controlled globals to prove the
 * production-build requirement for observability vars.
 */
describe("env bootstrap validation", () => {
  const original = { ...process.env };
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    process.env = { ...original };
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.resetModules();
  });

  it("allows missing observability and billing vars in development", () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).not.toThrow();
  });

  it("throws in a production build when Sentry/PostHog are unset", () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).toThrow(/EXPO_PUBLIC_SENTRY_DSN|EXPO_PUBLIC_POSTHOG_KEY/);
  });

  it("throws in a production build when the billing key is unset", () => {
    // A release that shipped without its store key would render an empty paywall
    // and silently take no money — fail at bootstrap instead.
    (global as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).toThrow(/EXPO_PUBLIC_REVENUECAT_IOS_KEY/);
  });

  it("refuses to build for production with a RevenueCat Test Store key", () => {
    // A test key simulates purchases and takes no money — shipping one would
    // show real users a fake purchase modal.
    (global as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = "test_abc123";

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).toThrow(/Test Store key must never ship/);
  });

  it('gates Apple auth off unless the flag is exactly "true"', () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;

    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = "true";
    jest.isolateModules(() => {
      expect(require("../env").env.appleAuthEnabled).toBe(true);
    });

    for (const value of ["false", "1", "yes", ""]) {
      process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED = value;
      jest.isolateModules(() => {
        expect(require("../env").env.appleAuthEnabled).toBe(false);
      });
    }

    delete process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED;
    jest.isolateModules(() => {
      expect(require("../env").env.appleAuthEnabled).toBe(false);
    });
  });

  it("passes in a production build when all are configured", () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = "appl_test_key";

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).not.toThrow();
  });
});
