import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { queryKeys } from "@/api";
import { ApiError, isApiError } from "@/api/errors";
import { env } from "@/config/env";
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

const MISSING_GOOGLE_CLIENT_ID = "missing-google-client-id.apps.googleusercontent.com";

function googleClientIdForPlatform(): string | undefined {
  if (Platform.OS === "android") return env.googleAndroidClientId;
  if (Platform.OS === "ios") return env.googleIosClientId;
  return env.googleWebClientId;
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
  const googleClientId = googleClientIdForPlatform();
  const isConfigured = Boolean(googleClientId);
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
    androidClientId: env.googleAndroidClientId,
    clientId: googleClientId ?? MISSING_GOOGLE_CLIENT_ID,
    selectAccount: true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isConfigured) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in is not configured for this platform.",
          status: 0,
        });
      }

      if (!request) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in is still initializing.",
          status: 0,
        });
      }

      const response = await promptAsync();
      if (response.type !== "success") {
        throw new ApiError({
          code: "UNKNOWN",
          message:
            response.type === "cancel" ? "Google sign-in was cancelled." : "Google sign-in failed.",
          status: 0,
        });
      }

      const idToken = response.params.id_token;
      if (!idToken) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google did not return an identity token.",
          status: 0,
        });
      }

      const token = await signInWithSocialIdToken({ provider: "google", idToken });
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
