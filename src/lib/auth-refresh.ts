import { z } from "zod";
import { env } from "@/config/env";
import { getRefreshToken, setTokens } from "./secure-store";

/**
 * Exchange the stored refresh token for a fresh access + refresh pair via
 * POST /auth/refresh, persist the new pair, and return the new access token (or
 * null on any failure — caller then treats the request as unauthenticated).
 *
 * Lives in `lib` (not the auth feature) so the API client seam can call it
 * without `lib` depending on `features`. Single-flighted: the backend rotates
 * refresh tokens (one-time-use), so concurrent 401s must share ONE refresh — a
 * second concurrent call would present an already-consumed token and fail.
 */
let inFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${env.apiUrl}${env.apiPrefix}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;

    const json: unknown = await res.json();
    const parsed = z
      .object({
        data: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }),
      })
      .safeParse(json);
    if (!parsed.success) return null;
    const { accessToken, refreshToken: nextRefresh } = parsed.data.data;

    await setTokens(accessToken, nextRefresh);
    return accessToken;
  } catch {
    return null;
  }
}
