import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthSession, SignInPayload } from "@/contracts";
import { setToken, clearToken, analytics } from "@/lib";
import { useSessionActions } from "@/stores";
import { signInWithPassword, logout } from "../api/auth.api";

/**
 * Persist a freshly-issued session: token → secure-store (source of truth),
 * session facts → store. The root guard then reacts and routes to (onboarding)
 * or (app). Kept in one place so every auth path (password/OAuth/OTP) is uniform.
 */
async function applySession(
  session: AuthSession,
  setSession: ReturnType<typeof useSessionActions>["setSession"]
): Promise<void> {
  await setToken(session.token);
  setSession({
    token: session.token,
    userId: session.user.id,
    isOnboarded: session.user.isOnboarded,
  });
  analytics.identify(session.user.id);
}

/** Email + password sign-in. Errors surface as `mutation.error` (an ApiError). */
export function useSignIn() {
  const { setSession } = useSessionActions();
  return useMutation({
    mutationFn: (input: SignInPayload) => signInWithPassword(input),
    onSuccess: (session) => applySession(session, setSession),
  });
}

/** Sign out: revoke server session, then clear local token + caches regardless. */
export function useLogout() {
  const { clearSession } = useSessionActions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSettled: async () => {
      await clearToken();
      clearSession();
      analytics.reset();
      queryClient.clear();
    },
  });
}
