import * as AppleAuthentication from "expo-apple-authentication";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { ApiError, isApiError } from "@/api/errors";
import { env } from "@/config/env";
import { authClient } from "@/lib/auth-client";
import type { AuthSession, MagicLinkRequestPayload, SignInPayload, User } from "@/contracts";
import { setToken, clearToken, analytics } from "@/lib";
import { getMe } from "@/features/profile";
import { useSessionActions } from "@/stores";
import {
  requestMagicLink,
  signInWithPassword,
  signInWithSocialIdToken,
  verifyMagicLink,
  logout,
} from "../api/auth.api";

/**
 * BetterAuth stores the session as a signed cookie whose value is exactly the
 * bearer token the API accepts (the bearer plugin verifies the same signature).
 * Extract it so a redirect-flow (Google) session joins the app's bearer-token
 * system via `applyToken`. Handles the production `__Secure-` cookie prefix.
 */
function sessionTokenFromCookie(cookie: string): string | null {
  const match = cookie.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Persist a freshly-issued session: token → secure-store (source of truth),
 * session facts → store. The root guard then reacts and routes to (onboarding)
 * or (app). Kept in one place so every token-returning auth path is uniform.
 */
async function applySession(
  session: AuthSession,
  setSession: ReturnType<typeof useSessionActions>["setSession"],
  queryClient: QueryClient
): Promise<User> {
  await setToken(session.token);
  queryClient.setQueryData(queryKeys.me(), session.user);
  setSession({
    token: session.token,
    userId: session.user.id,
    accountStatus: session.user.accountStatus,
    isOnboarded: session.user.isOnboarded,
  });
  analytics.identify(session.user.id);
  return session.user;
}

async function applyToken(
  token: string,
  setSession: ReturnType<typeof useSessionActions>["setSession"],
  queryClient: QueryClient
): Promise<User> {
  await setToken(token);
  try {
    const user = await getMe();
    queryClient.setQueryData(queryKeys.me(), user);
    setSession({
      token,
      userId: user.id,
      accountStatus: user.accountStatus,
      isOnboarded: user.isOnboarded,
    });
    analytics.identify(user.id);
    return user;
  } catch (error) {
    if (isApiError(error) && error.isAuthError) {
      await clearToken();
    }
    throw error;
  }
}

/** Email + password sign-in. Errors surface as `mutation.error` (an ApiError). */
export function useSignIn() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignInPayload) => signInWithPassword(input),
    onSuccess: (session) => applySession(session, setSession, queryClient),
  });
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (input: MagicLinkRequestPayload) => requestMagicLink(input),
  });
}

export function useVerifyMagicLink() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const sessionToken = await verifyMagicLink(token);
      return applyToken(sessionToken, setSession, queryClient);
    },
  });
}

export function useAppleSignIn() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Sign in with Apple is not available on this device.",
          status: 0,
        });
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Apple did not return an identity token.",
          status: 0,
        });
      }

      const token = await signInWithSocialIdToken({
        provider: "apple",
        idToken: credential.identityToken,
        firstName: credential.fullName?.givenName ?? undefined,
        email: credential.email ?? undefined,
      });
      return applyToken(token, setSession, queryClient);
    },
  });
}

export function useGoogleSignIn() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  // The web client id is set per environment once Google is wired; use its
  // presence as the "Google is available" flag for the UI gate.
  const isConfigured = Boolean(env.googleWebClientId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isConfigured) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in is not configured.",
          status: 0,
        });
      }

      // BetterAuth server-side OAuth (web client): the Expo plugin opens the
      // browser, completes the flow at the backend callback, returns to
      // `thrivo://`, and stores the session cookie.
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (error) {
        throw new ApiError({
          code: "UNKNOWN",
          message: error.message ?? "Google sign-in failed.",
          status: 0,
        });
      }

      const token = sessionTokenFromCookie(authClient.getCookie());
      if (!token) {
        // No stored session = the user cancelled or the flow didn't complete.
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in did not complete.",
          status: 0,
        });
      }

      return applyToken(token, setSession, queryClient);
    },
  });

  return { ...mutation, isConfigured };
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
