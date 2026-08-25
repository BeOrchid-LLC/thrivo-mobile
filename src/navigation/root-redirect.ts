import type { AuthStatus } from "@/stores/session.store";

export type RootGroup = string | undefined;
export type RootRedirectTarget =
  | "/(auth)/sign-in"
  | "/(auth)/welcome"
  | "/(onboarding)/name"
  | "/(app)/(tabs)/dashboard";

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

  // Sign-in is the unauthenticated entry point: a cold start lands here, and the
  // screen itself links across to sign-up. Welcome stays reachable, but only as
  // the biometric unlock surface below.
  if (status === "unauthenticated" && (atRoot || (!inAuth && !inAuthCallback))) {
    return "/(auth)/sign-in";
  }

  if (status === "authenticated" && isBiometricLocked) {
    return atRoot || inApp || inOnboarding ? "/(auth)/welcome" : null;
  }

  if (status === "authenticated" && !isOnboarded && !isOnboardingSkipped) {
    return atRoot || (!inOnboarding && !inAuthCallback) ? "/(onboarding)/name" : null;
  }

  if (status === "authenticated" && (isOnboarded || isOnboardingSkipped)) {
    return atRoot || inAuth || inOnboarding ? "/(app)/(tabs)/dashboard" : null;
  }

  if (status === "authenticated" && inApp) {
    return null;
  }

  return null;
}
