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

  it("allows missing observability vars in development", () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;

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

  it("passes in a production build when both are configured", () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.EXPO_PUBLIC_POSTHOG_KEY = "phc_test_key";

    expect(() => {
      jest.isolateModules(() => require("../env"));
    }).not.toThrow();
  });
});
