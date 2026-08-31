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
    email: "ada@example.com",
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
    expect(result.completed.name).toBe(true);
    expect(result.completed.goal).toBe(false);
  });

  it("ticks the name step off the answer itself, not the step counter", () => {
    // Regression: the name step writes `onboardingStep: 1`, but the column
    // already defaults to 1, so `Math.max(1, 1)` makes the write a no-op. Keying
    // completeness off the counter meant the row could never tick — and because
    // the scan below stops at the first incomplete step, every later step showed
    // "Complete earlier steps first" forever.
    const answered = getOnboardingProgress(
      profile({ name: "Ada", email: "ada@example.com", onboardingStep: 1 })
    );

    expect(answered.completed.name).toBe(true);
    // The scan now gets past step 1 instead of stopping dead on it.
    expect(answered.firstIncompleteStep).not.toBe(1);
    expect(answered.completedSteps).toBeGreaterThan(0);
  });

  it("counts a fresh account as not having answered the name step", () => {
    // A brand-new user already has a `name` — the server seeds it from the email
    // — and an `onboardingStep` of 1, this step's own number. Only having moved
    // past it says the question was actually asked.
    // A brand-new row already carries a name — the server seeds it from the
    // email's local part — so only its *difference* from that seed means anything.
    const result = getOnboardingProgress(
      profile({ name: "diyorbek", email: "diyorbek@example.com", onboardingStep: 1 })
    );

    expect(result.completedSteps).toBe(0);
    expect(result.firstIncompleteStep).toBe(1);
    expect(result.completed.name).toBe(false);
  });

  it("counts the name step as answered once the flow has moved past it", () => {
    const result = getOnboardingProgress(profile({ onboardingStep: 2, goal: null }));

    expect(result.completed.name).toBe(true);
    expect(result.firstIncompleteStep).toBe(2);
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
