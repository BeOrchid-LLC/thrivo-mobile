import { useEffect, useState } from "react";
import { router } from "expo-router";
import { BrandSplash, ErrorState, Screen } from "@/components";
import { useAuthStatus, useIsOnboarded, useIsOnboardingSkipped } from "@/stores";

const AUTH_CALLBACK_TIMEOUT_MS = 15_000;

/**
 * Clerk SSO callback route. `startSSOFlow` owns the browser callback and then
 * activates the session; this screen stays mounted until the root session
 * bootstrap has loaded the domain profile and can choose the final destination.
 */
export default function AuthCallbackScreen() {
  const status = useAuthStatus();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), AUTH_CALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(
        isOnboarded || isOnboardingSkipped ? "/(app)/(tabs)/dashboard" : "/(onboarding)/name"
      );
    }
  }, [isOnboarded, isOnboardingSkipped, status]);

  if (status === "restore_error" || timedOut) {
    return (
      <Screen padded={false}>
        <ErrorState
          title="Sign-in is taking too long"
          message="We could not finish activating your Google sign-in. Please try again."
          retryLabel="Try again"
          onRetry={() => router.replace("/(auth)/welcome")}
        />
      </Screen>
    );
  }

  return <BrandSplash busy />;
}
