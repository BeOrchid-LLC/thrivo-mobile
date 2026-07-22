import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { queryClient, queryKeys, isApiError } from "@/api";
import { getMe } from "@/features/profile";
import { analytics, monitoring } from "@/lib";
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
  const { isLoaded, isSignedIn } = useAuth();
  const status = useAuthStatus();
  const actions = useSessionActions();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      bootLog("clerk: not signed in");
      if (status === "loading" || status === "restore_error") {
        actions.setStatus("unauthenticated");
      }
      return;
    }

    if (status !== "loading") return;

    bootLog("clerk: signed in — fetching profile");

    void (async () => {
      try {
        const user = await getMe();
        queryClient.setQueryData(queryKeys.me(), user);
        actions.setSession({
          userId: user.id,
          accountStatus: user.accountStatus,
          isOnboarded: user.isOnboarded,
          isOnboardingSkipped: user.isOnboardingSkipped,
        });
        analytics.identify(user.id);
        monitoring.setUser({ id: user.id });
        bootLog("session restore finished: authenticated");
      } catch (error) {
        if (isApiError(error) && error.isAuthError) {
          bootLog("session restore finished: auth error");
          actions.clearSession();
          return;
        }
        bootLog("session restore failed");
        actions.setStatus("restore_error");
      }
    })();
  }, [isLoaded, isSignedIn, status, actions]);
}
