import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useClerk } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";
import { useBiometricUnlockActions, useSessionActions } from "@/stores";
import { logAuthError } from "../auth-debug";

// Required by @clerk/expo to properly close the auth session on Android.
WebBrowser.maybeCompleteAuthSession();

function bootLog(message: string): void {
  if (__DEV__) console.info(`[auth] ${message}`);
}

/**
 * Google OAuth via Clerk. On success: sets Clerk session active, then triggers
 * the session store to transition to "loading" so useSessionInit fetches the
 * profile. Always shown — Clerk manages the OAuth provider configuration.
 */
export function useGoogleSignIn() {
  const { startSSOFlow } = useSSO();
  const { setStatus } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      // Keep the callback on a real Expo Router route so a deep-link return
      // cannot be mistaken for the app root while Clerk is activating the session.
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "thrivo", path: "auth" });
      bootLog(`google: starting SSO with redirect ${redirectUrl}`);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      bootLog(`google: SSO returned a session=${Boolean(createdSessionId)}`);

      if (!createdSessionId || !setActive) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in was cancelled.",
          status: 0,
        });
      }

      await setActive({ session: createdSessionId });
      bootLog("google: Clerk session activated");
      setStatus("loading");
      setBiometricUnlocked(true);
      queryClient.clear();
    },
    onError: (error) => logAuthError("google", "SSO", error),
  });

  return { ...mutation, isConfigured: true as const };
}

/**
 * Apple OAuth via Clerk (iOS only). Uses the browser-based OAuth flow so both
 * new sign-ups and returning sign-ins are handled uniformly by Clerk.
 */
export function useAppleSignIn() {
  const { startSSOFlow } = useSSO();
  const { setStatus } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const queryClient = useQueryClient();
  const isConfigured = Platform.OS === "ios";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isConfigured) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Sign in with Apple is only available on iOS.",
          status: 0,
        });
      }

      const redirectUrl = AuthSession.makeRedirectUri({ scheme: "thrivo", path: "auth" });
      bootLog(`apple: starting SSO with redirect ${redirectUrl}`);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl,
      });

      bootLog(`apple: SSO returned a session=${Boolean(createdSessionId)}`);

      if (!createdSessionId || !setActive) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Apple sign-in was cancelled.",
          status: 0,
        });
      }

      await setActive({ session: createdSessionId });
      bootLog("apple: Clerk session activated");
      setStatus("loading");
      setBiometricUnlocked(true);
      queryClient.clear();
    },
    onError: (error) => logAuthError("apple", "SSO", error),
  });

  return { ...mutation, isConfigured };
}

/** Sign out: clear the Clerk session and reset local state. */
export function useLogout() {
  const { signOut } = useClerk();
  const { clearSession } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSettled: () => {
      clearSession();
      setBiometricUnlocked(false);
      queryClient.clear();
    },
  });
}
