import {
  clearPersistedQueryCache,
  queryClient,
  setTokenGetter,
  setUnauthenticatedHandler,
} from "@/api";
import { resetUserScopedStores, useBiometricUnlockStore, useSessionStore } from "@/stores";
import { analytics } from "./analytics";
import { monitoring } from "./monitoring";
import { clearUserScopedStorage } from "./storage";
import { subscription } from "./subscription";

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
    useBiometricUnlockStore.getState().actions.setBiometricUnlocked(false);
    resetUserScopedStores();
    // Clear memory synchronously: a forced sign-out can happen while requests
    // are in flight, and stale queries or paused offline mutations must not be
    // available to whichever user signs in next.
    queryClient.clear();
    analytics.reset();
    monitoring.setUser(null);
    // Drop the store identity too, or the next user on this device inherits the
    // previous one's entitlement.
    void subscription.logOut().catch((error: unknown) => {
      monitoring.captureException(error, { seam: "billing-logout" });
    });
    // The persisted cache and user-scoped storage are asynchronous, but both
    // must be removed before the next session can restore them.
    void Promise.all([
      clearPersistedQueryCache().catch((error: unknown) => {
        monitoring.captureException(error, { seam: "clear-query-cache-on-signout" });
      }),
      clearUserScopedStorage().catch((error: unknown) => {
        monitoring.captureException(error, { seam: "clear-user-storage-on-signout" });
      }),
    ]);
  });
}

export function wireClerkSignOut(fn: () => Promise<void>): void {
  clerkSignOutFn = fn;
}
