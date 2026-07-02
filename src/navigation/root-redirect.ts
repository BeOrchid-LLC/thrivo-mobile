import type { AuthStatus } from "@/stores/session.store";

export type RootGroup = string | undefined;
export type RootRedirectTarget = "/(auth)/welcome" | "/(onboarding)/name" | "/(app)/dashboard";

interface RootRedirectInput {
  group: RootGroup;
  status: AuthStatus;
  isOnboarded: boolean;
  isOnboardingSkipped: boolean;
  isBiometricLocked?: boolean;
}

export function resolveRootRedirect({
  group,
  status,
  isOnboarded,
  isOnboardingSkipped,
  isBiometricLocked = false,
}: RootRedirectInput): RootRedirectTarget | null {
  const atRoot = !group;
  const inAuth = group === "(auth)";
  const inApp = group === "(app)";
  const inOnboarding = group === "(onboarding)";
  const inAuthCallback = group === "auth";

  if (inAuthCallback || status === "loading" || status === "restore_error") {
    return null;
  }

  if (status === "unauthenticated" && (atRoot || (!inAuth && !inAuthCallback))) {
    return "/(auth)/welcome";
  }

  if (status === "authenticated" && isBiometricLocked) {
    return atRoot || inApp || inOnboarding ? "/(auth)/welcome" : null;
  }

  if (status === "authenticated" && !isOnboarded && !isOnboardingSkipped) {
    return atRoot || (!inOnboarding && !inAuthCallback) ? "/(onboarding)/name" : null;
  }

  if (status === "authenticated" && (isOnboarded || isOnboardingSkipped)) {
    return atRoot || inAuth || inOnboarding ? "/(app)/dashboard" : null;
  }

  if (status === "authenticated" && inApp) {
    return null;
  }

  return null;
}
