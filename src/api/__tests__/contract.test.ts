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
          unitSystem: "metric",
          onboardingStep: null,
          isOnboarded: true,
          targets: null,
          createdAt: "2026-06-14T00:00:00.000Z",
        },
      },
    };
    const parsed = envelope.safeParse(sample);
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
