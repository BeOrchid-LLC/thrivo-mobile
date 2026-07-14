import type { User, UserSettings } from "@/contracts";
import type { OnboardingDraft } from "@/stores";
import { buildOnboardingPrefill } from "../prefill";

const profile = (overrides: Partial<User> = {}) =>
  ({
    name: "Profile name",
    goal: "maintain",
    weightKg: "80",
    targetWeightKg: "80",
    heightCm: "180",
    age: 32,
    sex: "male",
    activityLevel: "moderate",
    manualDailyTargetKcal: 2100,
    notifyTimes: ["07:00:00"],
    timezone: "Africa/Lagos",
    onboardingStep: 4,
    ...overrides,
  }) as User;

const settings = (overrides: Partial<UserSettings> = {}) =>
  ({ unitSystem: "imperial", dailyFoodLogReminderTime: "09:30", ...overrides }) as UserSettings;

describe("onboarding prefill", () => {
  it("uses draft values before profile and settings", () => {
    const draft: OnboardingDraft = {
      firstName: "Draft name",
      goal: "lose",
      currentWeightKg: 70,
      unitSystem: "metric",
      manualDailyTargetKcal: null,
    };
    const result = buildOnboardingPrefill(draft, profile(), settings());

    expect(result.firstName).toBe("Draft name");
    expect(result.goal).toBe("lose");
    expect(result.currentWeightKg).toBe(70);
    expect(result.unitSystem).toBe("metric");
    expect(result.manualDailyTargetKcal).toBeNull();
  });

  it("hydrates missing draft values from profile, then settings", () => {
    const result = buildOnboardingPrefill(
      {},
      profile({ notifyTimes: null, timezone: null }),
      settings()
    );

    expect(result.heightCm).toBe(180);
    expect(result.ageYears).toBe(32);
    expect(result.activityLevel).toBe("moderate");
    expect(result.unitSystem).toBe("imperial");
    expect(result.notifyTimes).toEqual(["09:30"]);
    expect(result.timezone).toBeUndefined();
  });
});
