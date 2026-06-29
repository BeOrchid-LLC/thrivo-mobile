import * as Sentry from "@sentry/react-native";

// Drive the seam with a configured DSN so it forwards to the (mocked) SDK.
jest.mock("@/config/env", () => ({
  env: { sentryDsn: "https://public@o0.ingest.sentry.io/1", isProduction: false },
}));

describe("monitoring (Sentry sink)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("forwards captured exceptions to Sentry with extra context", () => {
    const { monitoring } = require("../monitoring");
    const error = new Error("boom");
    monitoring.captureException(error, { screen: "checkin" });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, { extra: { screen: "checkin" } });
  });

  it("sets and clears the user id (opaque, no PII)", () => {
    const { monitoring } = require("../monitoring");
    monitoring.setUser({ id: "u1" });
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: "u1" });
    monitoring.setUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it("initializes the SDK once with the DSN", () => {
    const { monitoring } = require("../monitoring");
    monitoring.init();
    monitoring.init();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@o0.ingest.sentry.io/1",
        sendDefaultPii: false,
      })
    );
  });
});
