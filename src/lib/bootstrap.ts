import { setTokenGetter, setUnauthenticatedHandler, setTokenRefresher } from "@/api";
import { useSessionStore } from "@/stores";
import { getToken, clearTokens } from "./secure-store";
import { refreshAccessToken } from "./auth-refresh";
import { analytics } from "./analytics";
import { monitoring } from "./monitoring";

/**
 * Wires the API client's injection seams (src/api/auth-token) to the device +
 * session layers. Kept here — not in the client — so the client never imports
 * stores or storage. Called once at app start (root layout, Phase 5).
 */
let wired = false;

export function wireApiSeams(): void {
  if (wired) return;
  wired = true;

  // The client reads the Bearer token from secure-store (source of truth).
  setTokenGetter(() => getToken());

  // On a 401 the client first tries to rotate the refresh token for a new access
  // token (single-flighted in auth-refresh) before giving up.
  setTokenRefresher(() => refreshAccessToken());

  // On a 401 the refresh couldn't recover: drop both tokens + session, reset SDKs.
  setUnauthenticatedHandler(() => {
    void clearTokens();
    useSessionStore.getState().actions.clearSession();
    analytics.reset();
    monitoring.setUser(null);
  });
}
