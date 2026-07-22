import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useClerk } from "@clerk/expo";
import { queryClient, queryKeys, isApiError } from "@/api";
import { getMe } from "@/features/profile";
import { useSessionActions, useSessionStore } from "@/stores";

/**
 * Re-validates the session when the app returns to the foreground. Refreshes the
 * full profile via `GET /users/me` and updates navigation facts if they changed.
 * On auth error, signs out via Clerk and clears local session state.
 */
export function useSessionRefresh(): void {
  const actions = useSessionActions();
  const { signOut } = useClerk();
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
          if (isApiError(error) && error.isAuthError) {
            void signOut();
            actions.clearSession();
          }
        }
      })();
    });

    return () => sub.remove();
  }, [actions, signOut]);
}
