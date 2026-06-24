import { useEffect } from "react";
import { callApi, isApiError } from "@/api";
import { getToken, clearToken } from "@/lib";
import { useAuthStatus, useSessionActions } from "@/stores";

/**
 * Hydrates the session store from secure-store at app start. A token is trusted
 * only after `GET /auth/session` succeeds; a 401 clears local auth, while transient
 * network failures keep the token for an explicit retry.
 */
export function useSessionInit(): void {
  const status = useAuthStatus();
  const actions = useSessionActions();

  useEffect(() => {
    let active = true;

    if (status !== "loading") return undefined;

    void (async () => {
      const token = await getToken();
      if (!active) return;

      if (!token) {
        actions.setStatus("unauthenticated");
        return;
      }

      try {
        const { session } = await callApi("GET_SESSION");
        if (!active) return;
        actions.setSession({
          token,
          userId: session.userId,
          accountStatus: session.accountStatus,
          isOnboarded: session.isOnboarded,
        });
      } catch (error) {
        if (!active) return;
        if (isApiError(error) && error.isAuthError) {
          await clearToken();
          actions.clearSession();
          return;
        }
        actions.setStatus("restore_error");
      }
    })();

    return () => {
      active = false;
    };
  }, [actions, status]);
}
