import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { ApiError, isApiError } from "@/api/errors";
import { env } from "@/config/env";
import type { OtpRequestPayload, OtpVerifyPayload, User } from "@/contracts";
import { setTokens, clearTokens, getRefreshToken, analytics, monitoring } from "@/lib";
import { getMe } from "@/features/profile";
import { useSessionActions } from "@/stores";
import { requestOtp, verifyOtp, logoutSession, googleStartUrl, appleSignIn } from "../api/auth.api";

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
    monitoring.setUser({ id: user.id });
    return user;
  } catch (error) {
    if (isApiError(error) && error.isAuthError) {
      await clearTokens();
    }
    throw error;
  }
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (input: OtpRequestPayload) => requestOtp(input),
  });
}

export function useVerifyOtp() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OtpVerifyPayload) => {
      const tokens = await verifyOtp(input);
      return applyTokens(tokens.accessToken, tokens.refreshToken, setSession, queryClient);
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
 * Native Sign in with Apple (iOS only). Obtains the signed identity token via
 * `expo-apple-authentication`, posts it to the backend (which verifies it against
 * Apple's JWKS and provisions/links the account), then funnels the returned token
 * pair through `applyTokens`. Apple supplies the full name only on first
 * authorization, so we forward it when present. `isConfigured` is iOS-gated so the
 * welcome screen hides the button on Android rather than showing it broken.
 */
export function useAppleSignIn() {
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  const isConfigured = Platform.OS === "ios";

  const mutation = useMutation({
    mutationFn: async (): Promise<User> => {
      if (!isConfigured) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Sign in with Apple is only available on iOS.",
          status: 0,
        });
      }

      let credential: AppleAuthentication.AppleAuthenticationCredential;
      try {
        credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
      } catch (error) {
        // The user dismissing the sheet surfaces as a cancel code — not loud.
        const code = (error as { code?: string })?.code;
        throw new ApiError({
          code: "UNKNOWN",
          message:
            code === "ERR_REQUEST_CANCELED"
              ? "Apple sign-in was cancelled."
              : "Apple sign-in failed. Please try again.",
          status: 0,
        });
      }

      const idToken = credential.identityToken;
      if (!idToken) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Apple sign-in did not complete.",
          status: 0,
        });
      }

      // Apple only returns the name on first authorization; omit it otherwise.
      const fullName = credential.fullName;
      const name = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ").trim() || undefined
        : undefined;

      const tokens = await appleSignIn(idToken, name);
      return applyTokens(tokens.accessToken, tokens.refreshToken, setSession, queryClient);
    },
  });

  return { ...mutation, isConfigured };
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
      monitoring.setUser(null);
      queryClient.clear();
    },
  });
}
