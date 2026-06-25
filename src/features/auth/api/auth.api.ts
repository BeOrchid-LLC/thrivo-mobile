import { z } from "zod";
import { env } from "@/config/env";
import { apiErrorFromResponse, networkError, parseError } from "@/api/errors";
import type { MagicLinkRequestPayload, OtpRequestPayload, OtpVerifyPayload } from "@/contracts";

/**
 * Auth intent functions for the hand-rolled backend auth (email OTP + Google).
 * These hit the public `/auth/*` endpoints directly — they're unauthenticated
 * and return the `{ data }` envelope, so they bypass `callApi` (which injects a
 * bearer + is typed for the endpoint registry). Hooks consume these; screens
 * never call them directly (MOBILE_ARCHITECTURE §6).
 */

/** Access + refresh pair returned by verify/refresh. */
export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  refreshExpiresAt: z.string(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

const ackSchema = z.null();

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw parseError("Auth response was not valid JSON");
  }
}

async function authPost<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${env.apiPrefix}/auth${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw networkError(cause instanceof Error ? cause.message : "Network request failed");
  }

  const text = await response.text();
  const json = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, json);
  }

  const envelope = z.object({ data: z.unknown() }).safeParse(json);
  const parsed = schema.safeParse(envelope.success ? envelope.data.data : undefined);
  if (!parsed.success) {
    throw parseError("Auth response did not match its contract", parsed.error.issues);
  }
  return parsed.data;
}

/** Request an email OTP. Backend always 202s (no account enumeration). */
export const requestOtp = (payload: OtpRequestPayload) =>
  authPost("/otp/request", { email: payload.email }, ackSchema);

/** Verify an email OTP and receive the token pair. */
export const verifyOtp = (payload: OtpVerifyPayload) =>
  authPost("/otp/verify", { email: payload.email, code: payload.code }, tokenPairSchema);

/**
 * @deprecated Magic-link auth remains API-supported but hidden in mobile while
 * the flow is revisited. Kept temporarily so the old route compiles until the
 * UI is replaced by the OTP request screen.
 */
export const requestMagicLink = (payload: MagicLinkRequestPayload) =>
  requestOtp({ email: payload.email });

/** Revoke the refresh session server-side. Tolerates an unknown token (204). */
export const logoutSession = async (refreshToken: string): Promise<void> => {
  try {
    await fetch(`${env.apiUrl}${env.apiPrefix}/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Logout is best-effort; the client clears local state regardless.
  }
};

/** The URL the system browser opens to begin Google OAuth (server-driven). */
export const googleStartUrl = (): string => `${env.apiUrl}${env.apiPrefix}/auth/google/start`;
