import { resolveRootRedirect } from "../root-redirect";

describe("resolveRootRedirect", () => {
  it("sends unauthenticated root visitors to sign-in", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "unauthenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
      })
    ).toBe("/(auth)/sign-in");
  });

  it("sends authenticated root visitors who need onboarding to onboarding", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
      })
    ).toBe("/(onboarding)/goal");
  });

  it("sends onboarded authenticated root visitors to dashboard", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
      })
    ).toBe("/(app)/(tabs)/dashboard");
  });

  it("sends onboarding-skipped authenticated root visitors to dashboard", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: true,
      })
    ).toBe("/(app)/(tabs)/dashboard");
  });

  it("keeps a user who already reached the app out of onboarding", () => {
    // The gate is one-time: a skip that never reached the server, or a launch
    // before the profile refresh lands, must not drop them back into the flow.
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
        hasDismissedOnboarding: true,
      })
    ).toBe("/(app)/(tabs)/dashboard");
  });

  it("sends a dismissed user who lands in the onboarding group back to the dashboard", () => {
    expect(
      resolveRootRedirect({
        group: "(onboarding)",
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
        hasDismissedOnboarding: true,
      })
    ).toBe("/(app)/(tabs)/dashboard");
  });

  it("leaves a dismissed user alone inside the app, where Settings reopens onboarding", () => {
    expect(
      resolveRootRedirect({
        group: "(app)",
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
        hasDismissedOnboarding: true,
      })
    ).toBeNull();
  });

  it("still gates a first-run user who has never reached the app", () => {
    expect(
      resolveRootRedirect({
        group: "(app)",
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
        hasDismissedOnboarding: false,
      })
    ).toBe("/(onboarding)/goal");
  });

  it("does not let the dismissal outrank the biometric lock", () => {
    expect(
      resolveRootRedirect({
        group: "(app)",
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
        hasDismissedOnboarding: true,
        isBiometricLocked: true,
      })
    ).toBe("/(auth)/welcome");
  });

  it("sends biometric-locked restored sessions from root to welcome", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
        isBiometricLocked: true,
      })
    ).toBe("/(auth)/welcome");
  });

  it("lets biometric-locked restored sessions stay on auth routes", () => {
    expect(
      resolveRootRedirect({
        group: "(auth)",
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
        isBiometricLocked: true,
      })
    ).toBeNull();
  });

  it("leaves onboarded authenticated users in the app group", () => {
    expect(
      resolveRootRedirect({
        group: "(app)",
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
      })
    ).toBeNull();
  });

  it("leaves the OAuth callback route alone", () => {
    expect(
      resolveRootRedirect({
        group: "auth",
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
      })
    ).toBeNull();
  });
});
