import { ENDPOINTS } from "../endpoints";
import { apiErrorFromResponse } from "../errors";
import { authSessionSchema, successEnvelope } from "@/contracts";

describe("Phase 2 — endpoints contract", () => {
  it("every endpoint declares a valid path, method and response schema", () => {
    const methods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
    for (const [key, config] of Object.entries(ENDPOINTS)) {
      expect(config.path.startsWith("/")).toBe(true);
      expect(methods.has(config.method)).toBe(true);
      // response is a zod schema (has safeParse)
      expect(typeof config.response.safeParse).toBe("function");
      // GET/DELETE should not declare a request payload
      if (config.method === "GET" || config.method === "DELETE") {
        expect("payload" in config).toBe(false);
        expect(key).toBeTruthy();
      }
    }
  });

  it("round-trips a valid success envelope through a response schema", () => {
    const envelope = successEnvelope(authSessionSchema);
    const sample = {
      success: true,
      responseCode: 200,
      message: "OK",
      data: {
        accessToken: "acc_123",
        refreshToken: "ref_456",
        refreshExpiresAt: "2026-07-30T00:00:00.000Z",
      },
    };
    const parsed = envelope.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it("parses GET /users/me through the published contract package", () => {
    const envelope = successEnvelope(ENDPOINTS.GET_ME.response);
    const parsed = envelope.safeParse({
      success: true,
      responseCode: 200,
      message: "OK",
      data: {
        id: "68711c81-d52c-4798-9fb0-ccda25f27a24",
        email: "user@thrivo.app",
        name: "Ada",
        image: "https://cdn.thrivo.fit/staging-files/user/68711c81/avatar/abc.jpg",
        goal: "lose",
        sex: "female",
        age: 34,
        heightCm: "170.0",
        weightKg: "82.5",
        targetWeightKg: "74.0",
        tdeeKcal: 2200,
        dailyTargetKcal: 1800,
        targetProteinG: 130,
        targetCarbsG: 180,
        targetFatG: 60,
        activityLevel: "moderate",
        manualDailyTargetKcal: null,
        notifyTimes: null,
        timezone: "Africa/Lagos",
        tier: "free",
        accountStatus: "free_trial",
        trialEndsAt: "2026-06-25T00:00:00.000Z",
        onboardingStep: 3,
        isOnboarded: true,
        isOnboardingSkipped: false,
        createdAt: "2026-06-18T00:00:00.000Z",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("parses settings and subscription endpoint responses", () => {
    expect(
      successEnvelope(ENDPOINTS.GET_SETTINGS.response).safeParse({
        success: true,
        responseCode: 200,
        message: "OK",
        data: {
          id: "68711c81-d52c-4798-9fb0-ccda25f27a24",
          userId: "68711c81-d52c-4798-9fb0-ccda25f27a25",
          unitSystem: "metric",
          pushNotificationsEnabled: true,
          dailyFoodLogReminderEnabled: true,
          dailyFoodLogReminderTime: "08:00",
          weightCheckReminderEnabled: true,
          weightCheckReminderDay: "friday",
          weightCheckReminderTime: "09:00",
          hydrationReminderEnabled: true,
          hydrationReminderIntervalMinutes: 40,
          createdAt: "2026-06-26T00:00:00.000Z",
          updatedAt: "2026-06-26T00:00:00.000Z",
        },
      }).success
    ).toBe(true);

    expect(
      successEnvelope(ENDPOINTS.GET_SUBSCRIPTION.response).safeParse({
        success: true,
        responseCode: 200,
        message: "OK",
        data: {
          subscription: {
            entitlement: "premium",
            status: "active",
            plan: "monthly",
            productId: "thrivo_premium_monthly",
            priceLabel: "$14.99",
            renewsAt: "2026-07-26T00:00:00.000Z",
            accessEndsAt: "2026-07-26T00:00:00.000Z",
            cancelAtPeriodEnd: false,
            trialUsed: true,
            trialDays: 14,
            plans: [
              {
                plan: "monthly",
                productId: "thrivo_premium_monthly",
                priceLabel: "$14.99",
                billingPeriodLabel: "month",
              },
            ],
          },
        },
      }).success
    ).toBe(true);
  });

  it("maps a backend error envelope to a typed ApiError", () => {
    const err = apiErrorFromResponse(429, {
      success: false,
      responseCode: 429,
      message: "Slow down",
      error: { code: "RATE_LIMITED", message: "Slow down" },
    });
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.status).toBe(429);
    expect(err.message).toBe("Slow down");
  });

  it("falls back to the status map for an unrecognized error body", () => {
    const err = apiErrorFromResponse(404, { something: "else" });
    expect(err.code).toBe("NOT_FOUND");
  });
});
