import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { queryClient, queryKeys, isApiError, handleUnauthenticated, type ApiError } from "@/api";
import { getMe } from "@/features/profile";
import { analytics, monitoring, subscription } from "@/lib";
import { useAuthStatus, useSessionActions } from "@/stores";

function bootLog(message: string): void {
  if (__DEV__) console.info(`[boot] ${message}`);
}

/**
 * A short `CODE: message` line for the restore-error screen. Restore can fail
 * for reasons that look identical to the user but need opposite fixes — the
 * device is offline, the backend is down, the response broke its contract — and
 * without the code on screen there is no way to tell them apart on a real
 * device.
 */
function describeRestoreFailure(error: unknown): string {
  if (isApiError(error)) {
    const status = error.status > 0 ? ` (${error.status})` : "";
    return `${error.code}${status}: ${error.message}`;
  }
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Backoff before giving up on session restore, in milliseconds.
 *
 * Restore failures are mostly transient — a rate limit, a cold backend, a
 * handover between networks — and a single attempt turns any of them into a
 * dead-end screen for a user whose session is perfectly valid. Roughly 16s of
 * quiet retrying costs a held splash; not retrying costs the session.
 */
const RESTORE_RETRY_DELAYS_MS = [500, 1500, 4000, 10000];

/** A failure no amount of retrying can fix: the token is bad, or the account is gone. */
function isTerminalRestoreFailure(error: unknown): error is ApiError {
  return isApiError(error) && (error.isAuthError || error.code === "NOT_FOUND");
}

/**
 * `GET /users/me`, retried through {@link RESTORE_RETRY_DELAYS_MS} for anything
 * that might succeed on a second look. Terminal failures rethrow immediately —
 * retrying a revoked token just delays the sign-out the user needs.
 */
async function fetchMeWithRetry(isActive: () => boolean) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getMe();
    } catch (error) {
      if (
        isTerminalRestoreFailure(error) ||
        attempt >= RESTORE_RETRY_DELAYS_MS.length ||
        !isActive()
      ) {
        throw error;
      }
      const delay = RESTORE_RETRY_DELAYS_MS[attempt]!;
      bootLog(`session restore attempt ${attempt + 1} failed; retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Bridges Clerk's auth state into the app's session store. Runs at every auth
 * state transition:
 * - Clerk not yet loaded → stay in "loading" (splash held).
 * - Clerk loaded, not signed in → "unauthenticated" → navigation guard → (auth).
 * - Clerk loaded, signed in, status="loading" → fetch GET /users/me → setSession.
 *
 * Fresh sign-ins set status="loading" from the verify/OAuth screens so this hook
 * picks up the profile fetch for both session restore AND fresh sign-in.
 */
export function useSessionInit(): void {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const status = useAuthStatus();
  const actions = useSessionActions();
  const authFailure = useRef(false);

  useEffect(() => {
    let active = true;

    if (!isLoaded)
      return () => {
        active = false;
      };

    if (!isSignedIn) {
      bootLog("clerk: not signed in");
      authFailure.current = false;
      if (active && status !== "unauthenticated") {
        actions.setStatus("unauthenticated");
      }
      return () => {
        active = false;
      };
    }

    // A rejected API token signs Clerk out through the shared auth seam. Hold
    // the local state at unauthenticated until Clerk reflects that sign-out;
    // otherwise the recovery path would immediately retry the same bad token.
    if (authFailure.current) {
      return () => {
        active = false;
      };
    }

    if (status === "authenticated" || status === "restore_error") {
      return () => {
        active = false;
      };
    }

    // Clerk can finish an auth operation just after this hook observed
    // `isSignedIn === false` and marked the local store unauthenticated. Once
    // Clerk is authoritative again, move the local store back through loading
    // so the profile is fetched and the root guard can choose the real route.
    if (status !== "loading") {
      bootLog(`clerk: signed in while local status was ${status}; resyncing`);
      actions.setStatus("loading");
      return () => {
        active = false;
      };
    }

    bootLog("clerk: signed in — fetching profile");

    void (async () => {
      try {
        const user = await fetchMeWithRetry(() => active);
        if (!active) return;
        queryClient.setQueryData(queryKeys.me(), user);
        actions.setSession({
          userId: user.id,
          accountStatus: user.accountStatus,
          isOnboarded: user.isOnboarded,
          isOnboardingSkipped: user.isOnboardingSkipped,
        });
        // The query cache is persisted, so a "free" entitlement cached before a
        // purchase would rehydrate inside its staleTime and silently gate the
        // app. Revalidate once here rather than per screen mount: an entitlement
        // cannot change while the app is closed without a webhook behind it, and
        // refetching on every mount put a request behind every tab switch.
        void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me() });
        analytics.identify(user.id);
        monitoring.setUser({ id: user.id });
        // Identify to the store by our own user id so entitlements follow the
        // person across devices and reinstalls (restore-on-second-device).
        void subscription.configure(user.id).catch((error: unknown) => {
          monitoring.captureException(error, { seam: "billing-configure" });
        });
        bootLog("session restore finished: authenticated");
      } catch (error) {
        if (!active) return;
        // 401 means the token is bad; 404 means the account no longer exists —
        // the case after a deletion, where Clerk can still report a signed-in
        // session for a moment while the backend row is already gone. Both are
        // terminal: retrying can never succeed, so sign out cleanly instead of
        // parking on the retryable "Could not restore your session" screen.
        if (isTerminalRestoreFailure(error)) {
          bootLog(`session restore finished: account gone (${error.status})`);
          authFailure.current = true;
          handleUnauthenticated();
          return;
        }
        const detail = describeRestoreFailure(error);
        bootLog(`session restore failed: ${detail}`);
        monitoring.captureException(error, { seam: "session-restore" });
        actions.setRestoreError(detail);
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, status, actions]);
}
