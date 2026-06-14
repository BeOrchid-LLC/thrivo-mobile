import { setTokenGetter, setUnauthenticatedHandler } from "@/api";
import { useSessionStore } from "@/stores";
import { getToken, clearToken } from "./secure-store";
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

  // On a 401 the client signals here: drop the token + session and reset SDKs.
  setUnauthenticatedHandler(() => {
    void clearToken();
    useSessionStore.getState().actions.clearSession();
    analytics.reset();
    monitoring.setUser(null);
  });
}
