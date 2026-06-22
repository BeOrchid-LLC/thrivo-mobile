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
      data: {
        token: "tok_123",
        user: {
          id: "u1",
          email: "a@b.com",
          name: "Ada",
          goal: "lose",
          sex: "female",
          age: 34,
          heightCm: "170.0",
          weightKg: "82.5",
          targetWeightKg: "74.0",
          tdeeKcal: 2200,
          dailyTargetKcal: 1800,
          targetProteinG: 135,
          targetCarbsG: 180,
          targetFatG: 60,
          activityLevel: "moderate",
          manualDailyTargetKcal: null,
          notifyTimes: null,
          timezone: "Africa/Lagos",
          tier: "free",
          accountStatus: "free_trial",
          trialEndsAt: "2026-06-26T00:00:00.000Z",
          onboardingStep: 7,
          isOnboarded: true,
          createdAt: "2026-06-14T00:00:00.000Z",
        },
      },
    };
    const parsed = envelope.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it("parses GET /users/me through the published contract package", () => {
    const envelope = successEnvelope(ENDPOINTS.GET_ME.response);
    const parsed = envelope.safeParse({
      data: {
        id: "68711c81-d52c-4798-9fb0-ccda25f27a24",
        email: "user@thrivo.app",
        name: "Ada",
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
        createdAt: "2026-06-18T00:00:00.000Z",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("maps a backend error envelope to a typed ApiError", () => {
    const err = apiErrorFromResponse(429, {
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
