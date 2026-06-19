import { callApi } from "@/api";
import { env } from "@/config/env";
import {
  authSessionSchema,
  type MagicLinkRequestPayload,
  type OtpRequestPayload,
  type OtpVerifyPayload,
  type SignInPayload,
} from "@/contracts";
import { apiErrorFromResponse, networkError, parseError, ApiError } from "@/api/errors";
import * as Linking from "expo-linking";
import { z } from "zod";

/**
 * Auth intent functions — thin wrappers over the typed client (one per backend
 * action). Hooks consume these; screens never call the client directly
 * (MOBILE_ARCHITECTURE §6).
 */
export const signInWithPassword = (payload: SignInPayload) =>
  callApi("PASSWORD_SIGNIN", { payload });

export const requestOtp = (payload: OtpRequestPayload) => callApi("OTP_REQUEST", { payload });

export const verifyOtp = (payload: OtpVerifyPayload) => callApi("OTP_VERIFY", { payload });

export const logout = () => callApi("LOGOUT");

const betterAuthAck = z.object({ status: z.boolean() });
const magicLinkVerifyResponse = z.object({ token: z.string().min(1) });
const socialTokenResponse = z.object({
  redirect: z.boolean().optional(),
  token: z.string().min(1).optional(),
  url: z.string().optional(),
});

async function betterAuthRequest<T>(
  path: string,
  options: RequestInit,
  schema: z.ZodType<T>
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${env.apiPrefix}/auth${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : null),
        ...options.headers,
      },
    });
  } catch (cause) {
    throw networkError(cause instanceof Error ? cause.message : "Network request failed");
  }

  const text = await response.text();
  const body = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, body);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw parseError("Auth response did not match its contract", parsed.error.issues);
  }
  return parsed.data;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw parseError("Auth response was not valid JSON");
  }
}

export const requestMagicLink = (payload: MagicLinkRequestPayload) =>
  betterAuthRequest(
    "/sign-in/magic-link",
    {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        name: payload.firstName,
        metadata: { appUrl: Linking.createURL("/magic-link") },
      }),
    },
    betterAuthAck
  );

export const verifyMagicLink = async (token: string): Promise<string> => {
  const result = await betterAuthRequest(
    `/magic-link/verify?token=${encodeURIComponent(token)}`,
    { method: "GET" },
    magicLinkVerifyResponse
  );
  return result.token;
};

export const signInWithSocialIdToken = async (input: {
  provider: "google" | "apple";
  idToken: string;
  firstName?: string;
  email?: string;
}): Promise<string> => {
  const result = await betterAuthRequest(
    "/sign-in/social",
    {
      method: "POST",
      body: JSON.stringify({
        provider: input.provider,
        requestSignUp: true,
        idToken: {
          token: input.idToken,
          user: {
            email: input.email,
            name: input.firstName ? { firstName: input.firstName } : undefined,
          },
        },
      }),
    },
    socialTokenResponse
  );

  if (!result.token) {
    throw new ApiError({
      code: "UNKNOWN",
      message: result.url
        ? "Social sign-in requires a browser redirect."
        : "No session token returned.",
      status: 0,
    });
  }
  return result.token;
};

export { authSessionSchema };
