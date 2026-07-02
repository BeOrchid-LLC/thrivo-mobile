import { resolveRootRedirect } from "../root-redirect";

describe("resolveRootRedirect", () => {
  it("sends unauthenticated root visitors to welcome", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "unauthenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
      })
    ).toBe("/(auth)/welcome");
  });

  it("sends authenticated root visitors who need onboarding to onboarding", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: false,
      })
    ).toBe("/(onboarding)/name");
  });

  it("sends onboarded authenticated root visitors to dashboard", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: true,
        isOnboardingSkipped: false,
      })
    ).toBe("/(app)/dashboard");
  });

  it("sends onboarding-skipped authenticated root visitors to dashboard", () => {
    expect(
      resolveRootRedirect({
        group: undefined,
        status: "authenticated",
        isOnboarded: false,
        isOnboardingSkipped: true,
      })
    ).toBe("/(app)/dashboard");
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
