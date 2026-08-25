import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { queryClient, queryKeys, isApiError, handleUnauthenticated } from "@/api";
import { getMe } from "@/features/profile";
import { useSessionActions, useSessionStore } from "@/stores";

/**
 * Re-validates the session when the app returns to the foreground. Refreshes the
 * full profile via `GET /users/me` and updates navigation facts if they changed.
 * A 401 (bad token) or 404 (account deleted, possibly on another device) is
 * terminal and routes through the shared unauthenticated seam. Anything else is
 * transient and left alone for the next foreground.
 */
export function useSessionRefresh(): void {
  const actions = useSessionActions();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const wasBackground = appState.current === "inactive" || appState.current === "background";
      appState.current = next;
      if (!wasBackground || next !== "active") return;
      if (useSessionStore.getState().status !== "authenticated") return;

      void (async () => {
        try {
          const user = await getMe();
          queryClient.setQueryData(queryKeys.me(), user);
          actions.setProfileStatus({
            accountStatus: user.accountStatus,
            isOnboarded: user.isOnboarded,
            isOnboardingSkipped: user.isOnboardingSkipped,
          });
        } catch (error) {
          // 401 means the token is bad; 404 means the account is gone — deleted
          // here or on another device. Both are terminal, and neither can be
          // recovered by refreshing again. Anything else is transient: keep the
          // session and let the next foreground retry.
          if (isApiError(error) && (error.isAuthError || error.code === "NOT_FOUND")) {
            // The shared seam signs out of Clerk, clears the session, resets
            // analytics and the store identity, and purges the device — doing it
            // by hand here would drift from that, as it already had.
            handleUnauthenticated();
          }
        }
      })();
    });

    return () => sub.remove();
  }, [actions]);
}
