import { useEffect } from "react";
import { queryClient, queryKeys, isApiError } from "@/api";
import { getToken, clearToken } from "@/lib";
import { getMe } from "@/features/profile";
import { useAuthStatus, useSessionActions } from "@/stores";

/**
 * Hydrates the session store from secure-store at app start. A token is trusted
 * only after `/users/me` succeeds; a 401 clears local auth, while transient
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
        const user = await getMe();
        if (!active) return;
        queryClient.setQueryData(queryKeys.me(), user);
        actions.setSession({ token, userId: user.id, accountStatus: user.accountStatus });
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
