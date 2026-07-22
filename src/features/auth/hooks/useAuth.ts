import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSSO, useClerk } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";
import { useBiometricUnlockActions, useSessionActions } from "@/stores";

// Required by @clerk/expo to properly close the auth session on Android.
WebBrowser.maybeCompleteAuthSession();

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
      const redirectUrl = Linking.createURL("/");
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (!createdSessionId || !setActive) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Google sign-in was cancelled.",
          status: 0,
        });
      }

      await setActive({ session: createdSessionId });
      setBiometricUnlocked(true);
      queryClient.clear();
      setStatus("loading");
    },
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

      const redirectUrl = Linking.createURL("/");
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl,
      });

      if (!createdSessionId || !setActive) {
        throw new ApiError({
          code: "UNKNOWN",
          message: "Apple sign-in was cancelled.",
          status: 0,
        });
      }

      await setActive({ session: createdSessionId });
      setBiometricUnlocked(true);
      queryClient.clear();
      setStatus("loading");
    },
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
