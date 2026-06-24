import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { ApiError, isApiError } from "@/api/errors";
import { env } from "@/config/env";
import type { MagicLinkRequestPayload, User } from "@/contracts";
import { setTokens, clearTokens, getRefreshToken, analytics } from "@/lib";
import { getMe } from "@/features/profile";
import { useSessionActions } from "@/stores";
import { requestMagicLink, verifyMagicLink, logoutSession, googleStartUrl } from "../api/auth.api";

// The OAuth callback redirects here with the issued tokens; openAuthSessionAsync
// watches for this exact return URL (matches the backend APP_AUTH_REDIRECT_URL).
const OAUTH_RETURN_URL = "thrivo://auth";

/**
 * Persist a freshly-issued token pair: tokens → secure-store (source of truth),
 * then confirm with `/users/me` and seed the session store. Every token-returning
 * auth path funnels through here so persistence + routing facts stay uniform.
 */
async function applyTokens(
  accessToken: string,
  refreshToken: string,
  setSession: ReturnType<typeof useSessionActions>["setSession"],
  queryClient: QueryClient
): Promise<User> {
  await setTokens(accessToken, refreshToken);
  try {
    const user = await getMe();
    queryClient.setQueryData(queryKeys.me(), user);
    setSession({
      token: accessToken,
      userId: user.id,
      accountStatus: user.accountStatus,
      isOnboarded: user.isOnboarded,
      isOnboardingSkipped: user.isOnboardingSkipped,
    });
    analytics.identify(user.id);
    return user;
  } catch (error) {
    if (isApiError(error) && error.isAuthError) {
      await clearTokens();
    }
    throw error;
  }
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
      const pair = await verifyMagicLink(token);
      return applyTokens(pair.accessToken, pair.refreshToken, setSession, queryClient);
    },
  });
}

export function useGoogleSignIn() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  // The web client id is the per-environment "Google is wired" flag for the UI;
  // the OAuth flow itself is fully server-driven (the app only opens the browser).
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

      // Open the system browser at our /auth/google/start; the backend completes
      // the flow and redirects to thrivo://auth?token&refresh, which this resolves.
      const result = await WebBrowser.openAuthSessionAsync(googleStartUrl(), OAUTH_RETURN_URL);
      if (result.type !== "success" || !result.url) {
        // cancel/dismiss = the user backed out; not an error worth surfacing loudly.
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in was cancelled.",
          status: 0,
        });
      }

      const { queryParams } = Linking.parse(result.url);
      const error = typeof queryParams?.error === "string" ? queryParams.error : null;
      if (error) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in failed. Please try again.",
          status: 0,
        });
      }

      const token = typeof queryParams?.token === "string" ? queryParams.token : null;
      const refresh = typeof queryParams?.refresh === "string" ? queryParams.refresh : null;
      if (!token || !refresh) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in did not complete.",
          status: 0,
        });
      }

      return applyTokens(token, refresh, setSession, queryClient);
    },
  });

  return { ...mutation, isConfigured };
}

/**
 * Apple sign-in is deferred (ADR — Android dev build first). `isConfigured`
 * mirrors the Google pattern so the welcome screen can hide the button
 * entirely rather than showing it as broken.
 */
export function useAppleSignIn() {
  const mutation = useMutation({
    mutationFn: async (): Promise<User> => {
      throw new ApiError({
        code: "UNKNOWN",
        message: "Sign in with Apple is not yet available.",
        status: 0,
      });
    },
  });
  return { ...mutation, isConfigured: false };
}

/** Sign out: revoke the server session, then clear local token + caches regardless. */
export function useLogout() {
  const { clearSession } = useSessionActions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) await logoutSession(refreshToken);
    },
    onSettled: async () => {
      await clearTokens();
      clearSession();
      analytics.reset();
      queryClient.clear();
    },
  });
}
