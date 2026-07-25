import { useEffect } from "react";
import { router } from "expo-router";
import { BrandSplash } from "@/components";
import { useAuthStatus, useIsOnboarded, useIsOnboardingSkipped } from "@/stores";

/**
 * Clerk SSO callback route. `startSSOFlow` owns the browser callback and then
 * activates the session; this screen stays mounted until the root session
 * bootstrap has loaded the domain profile and can choose the final destination.
 */
export default function AuthCallbackScreen() {
  const status = useAuthStatus();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(
        isOnboarded || isOnboardingSkipped ? "/(app)/dashboard" : "/(onboarding)/name"
      );
      return;
    }

    // A cancelled/failed callback has no active Clerk session. Returning to
    // welcome lets the mutation error or normal auth controls be used again.
    if (status === "unauthenticated") router.replace("/(auth)/welcome");
  }, [isOnboarded, isOnboardingSkipped, status]);

  return <BrandSplash />;
}
