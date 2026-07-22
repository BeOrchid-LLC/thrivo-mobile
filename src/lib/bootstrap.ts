import { setTokenGetter, setUnauthenticatedHandler } from "@/api";
import { useSessionStore } from "@/stores";
import { analytics } from "./analytics";
import { monitoring } from "./monitoring";

let wired = false;
let clerkSignOutFn: (() => Promise<void>) | null = null;

/**
 * Wires the API client's injection seams. Called once at module load in the root
 * layout. The token getter is a no-op until ClerkTokenBridge registers Clerk's
 * session.getToken once ClerkProvider is mounted.
 */
export function wireApiSeams(): void {
  if (wired) return;
  wired = true;

  setTokenGetter(() => Promise.resolve(null));

  // No token refresher: Clerk's getToken() always returns a fresh short-lived
  // token. On 401 from our backend, skip retry and go straight to sign-out.

  setUnauthenticatedHandler(() => {
    void clerkSignOutFn?.();
    useSessionStore.getState().actions.clearSession();
    analytics.reset();
    monitoring.setUser(null);
  });
}

export function wireClerkSignOut(fn: () => Promise<void>): void {
  clerkSignOutFn = fn;
}
