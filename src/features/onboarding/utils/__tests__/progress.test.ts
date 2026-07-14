import type { User } from "@/contracts";
import { getOnboardingProgress } from "../progress";

const profile = (overrides: Partial<User> = {}) =>
  ({
    name: "Ada",
    goal: "lose",
    weightKg: "80",
    targetWeightKg: "70",
    heightCm: "180",
    age: 32,
    sex: "female",
    activityLevel: "moderate",
    dailyTargetKcal: 1900,
    notifyTimes: ["08:00:00"],
    timezone: "UTC",
    onboardingStep: 7,
    isOnboarded: false,
    ...overrides,
  }) as User;

describe("onboarding progress", () => {
  it("starts at the first missing step after a skip", () => {
    const result = getOnboardingProgress(profile({ goal: null }));

    expect(result.status).toBe("incomplete");
    expect(result.completedSteps).toBe(1);
    expect(result.firstIncompleteStep).toBe(2);
    expect(result.completed.goal).toBe(false);
  });

  it("treats later data as locked behind an earlier missing step", () => {
    const result = getOnboardingProgress(profile({ activityLevel: null }));

    expect(result.completedSteps).toBe(4);
    expect(result.firstIncompleteStep).toBe(5);
    expect(result.completed.notifications).toBe(false);
  });

  it("locks complete users as complete even when legacy data is incomplete", () => {
    const result = getOnboardingProgress(
      profile({ isOnboarded: true, name: "", goal: null, heightCm: null })
    );

    expect(result.status).toBe("complete");
    expect(result.completedSteps).toBe(7);
    expect(result.firstIncompleteStep).toBeNull();
  });
});
