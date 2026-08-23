import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useClerk } from "@clerk/expo";
import { useSignInWithGoogle } from "@clerk/expo/google";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";
import { env } from "@/config/env";
import { useBiometricUnlockActions, useSessionActions } from "@/stores";
import { logAuthError } from "../auth-debug";
import { analytics, clearUserScopedStorage, monitoring } from "@/lib";
import { useFavoritesActions, useOnboardingDraftActions, usePreferencesActions } from "@/stores";
import { clearPersistedQueryCache } from "@/api";

// Required by @clerk/expo to properly close the auth session on Android (Apple
// browser SSO below still relies on this).
WebBrowser.maybeCompleteAuthSession();

function bootLog(message: string): void {
  if (__DEV__) console.info(`[auth] ${message}`);
}

/**
 * Native Google Sign-In via Clerk (`@clerk/expo/google`). Uses the platform
 * credential picker — Android Credential Manager / iOS ASAuthorization — so the
 * account chooser appears as an in-app modal with no browser round-trip. On
 * success: sets the Clerk session active, then transitions the session store to
 * "loading" so useSessionInit fetches the profile.
 *
 * `isConfigured` is driven by the runtime client IDs: the web client ID is
 * required on both platforms, and the iOS client ID is additionally required on
 * iOS. When unset the button is hidden rather than throwing at flow start.
 */
export function useGoogleSignIn() {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { setStatus } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const queryClient = useQueryClient();

  const isConfigured = Boolean(
    env.googleWebClientId && (Platform.OS !== "ios" || env.googleIosClientId)
  );

  const mutation = useMutation({
    mutationFn: async () => {
      bootLog("google: starting native credential flow");
      const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();

      bootLog(`google: native flow returned a session=${Boolean(createdSessionId)}`);

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
    onError: (error) => logAuthError("google", "native", error),
  });

  return { ...mutation, isConfigured };
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
  // iOS-only, and gated behind the feature flag (default off) since Apple's Clerk
  // flow needs no client-side credential to react to.
  const isConfigured = Platform.OS === "ios" && env.appleAuthEnabled;

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
  const { reset: resetFavorites } = useFavoritesActions();
  const { reset: resetDraft } = useOnboardingDraftActions();
  const { reset: resetPreferences } = usePreferencesActions();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSettled: () => {
      clearSession();
      setBiometricUnlocked(false);
      queryClient.clear();
      resetFavorites();
      resetDraft();
      resetPreferences();
      analytics.reset();
      monitoring.setUser(null);
      void clearUserScopedStorage().catch((error: unknown) =>
        monitoring.captureException(error, { seam: "logout-storage-purge" })
      );
      void clearPersistedQueryCache().catch((error: unknown) =>
        monitoring.captureException(error, { seam: "logout-query-purge" })
      );
    },
  });
}
