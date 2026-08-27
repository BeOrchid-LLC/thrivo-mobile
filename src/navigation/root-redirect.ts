import type { AuthStatus } from "@/stores/session.store";

export type RootGroup = string | undefined;
export type RootRedirectTarget =
  | "/(auth)/sign-in"
  | "/(auth)/welcome"
  | "/(onboarding)/goal"
  | "/(app)/(tabs)/dashboard";

interface RootRedirectInput {
  group: RootGroup;
  status: AuthStatus;
  isOnboarded: boolean;
  isOnboardingSkipped: boolean;
  isBiometricLocked?: boolean;
  /**
   * This user has already been through to the app on this device.
   *
   * Onboarding is a one-time gate: once someone has reached the dashboard —
   * by finishing it, by skipping it, or because a skip never made it to the
   * server — a later launch must not drop them back into it. They pick it up
   * again from Settings instead.
   */
  hasDismissedOnboarding?: boolean;
}

export function resolveRootRedirect({
  group,
  status,
  isOnboarded,
  isOnboardingSkipped,
  isBiometricLocked = false,
  hasDismissedOnboarding = false,
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

  const pastOnboarding = isOnboarded || isOnboardingSkipped || hasDismissedOnboarding;

  if (status === "authenticated" && !pastOnboarding) {
    return atRoot || (!inOnboarding && !inAuthCallback) ? "/(onboarding)/goal" : null;
  }

  // The `(onboarding)` group is the one-time flow only; re-opening a step from
  // Settings renders inside `(app)`, so sending this group to the dashboard
  // never strands the revisit path.
  if (status === "authenticated" && pastOnboarding) {
    return atRoot || inAuth || inOnboarding ? "/(app)/(tabs)/dashboard" : null;
  }

  if (status === "authenticated" && inApp) {
    return null;
  }

  return null;
}
