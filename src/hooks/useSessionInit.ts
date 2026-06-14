import { useEffect } from "react";
import { getToken } from "@/lib";
import { useSessionActions } from "@/stores";

/**
 * Hydrates the session store from secure-store at app start so the navigation
 * guard knows where to land. If a token exists the user is marked authenticated
 * optimistically; Phase 6's useAuth refines `userId`/`isOnboarded` from
 * `/users/me`. No token → unauthenticated.
 */
export function useSessionInit(): void {
  const actions = useSessionActions();

  useEffect(() => {
    let active = true;
    void getToken().then((token) => {
      if (!active) return;
      if (token) {
        actions.setSession({ token, userId: "", isOnboarded: false });
      } else {
        actions.setStatus("unauthenticated");
      }
    });
    return () => {
      active = false;
    };
  }, [actions]);
}
