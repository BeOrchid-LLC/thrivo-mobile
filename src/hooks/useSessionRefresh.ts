import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { queryClient, queryKeys, isApiError } from "@/api";
import { clearToken } from "@/lib";
import { getMe } from "@/features/profile";
import { useSessionActions, useSessionStore } from "@/stores";

/**
 * Re-validates the session when the app returns to the foreground. Refreshes the
 * full profile via `GET /users/me` and updates navigation facts if they changed.
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
          });
        } catch (error) {
          if (isApiError(error) && error.isAuthError) {
            await clearToken();
            actions.clearSession();
          }
        }
      })();
    });

    return () => sub.remove();
  }, [actions]);
}
