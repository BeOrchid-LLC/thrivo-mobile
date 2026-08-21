import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { queryClient, queryKeys, isApiError, handleUnauthenticated } from "@/api";
import { getMe } from "@/features/profile";
import { analytics, monitoring, subscription } from "@/lib";
import { useAuthStatus, useSessionActions } from "@/stores";

function bootLog(message: string): void {
  if (__DEV__) console.info(`[boot] ${message}`);
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
        const user = await getMe();
        if (!active) return;
        queryClient.setQueryData(queryKeys.me(), user);
        actions.setSession({
          userId: user.id,
          accountStatus: user.accountStatus,
          isOnboarded: user.isOnboarded,
          isOnboardingSkipped: user.isOnboardingSkipped,
        });
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
        if (isApiError(error) && error.isAuthError) {
          bootLog(`session restore finished: auth error (${error.status})`);
          authFailure.current = true;
          handleUnauthenticated();
          return;
        }
        bootLog(`session restore failed${error instanceof Error ? `: ${error.message}` : ""}`);
        actions.setStatus("restore_error");
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, status, actions]);
}
