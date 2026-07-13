import type { User, UserSettings } from "@/contracts";
import type { OnboardingDraft } from "@/stores";

function parseNumber(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTimes(times: string[] | null | undefined): string[] | undefined {
  if (!times?.length) return undefined;
  return times.map((time) => time.slice(0, 5));
}

export function buildOnboardingPrefill(
  draft: OnboardingDraft,
  user?: User | null,
  settings?: UserSettings | null
): OnboardingDraft {
  const profileTimes = normalizeTimes(user?.notifyTimes);
  const settingsTime = settings?.dailyFoodLogReminderTime?.slice(0, 5);

  return {
    firstName: draft.firstName ?? user?.name ?? undefined,
    goal: draft.goal ?? user?.goal ?? undefined,
    currentWeightKg: draft.currentWeightKg ?? parseNumber(user?.weightKg),
    targetWeightKg: draft.targetWeightKg ?? parseNumber(user?.targetWeightKg),
    heightCm: draft.heightCm ?? parseNumber(user?.heightCm),
    ageYears: draft.ageYears ?? user?.age ?? undefined,
    sex: draft.sex ?? user?.sex ?? undefined,
    unitSystem: draft.unitSystem ?? settings?.unitSystem ?? undefined,
    activityLevel: draft.activityLevel ?? user?.activityLevel ?? undefined,
    manualDailyTargetKcal:
      draft.manualDailyTargetKcal !== undefined
        ? draft.manualDailyTargetKcal
        : (user?.manualDailyTargetKcal ?? undefined),
    notifyTimes: draft.notifyTimes ?? profileTimes ?? (settingsTime ? [settingsTime] : undefined),
    timezone: draft.timezone ?? user?.timezone ?? undefined,
    onboardingStep: draft.onboardingStep ?? user?.onboardingStep ?? undefined,
  };
}
