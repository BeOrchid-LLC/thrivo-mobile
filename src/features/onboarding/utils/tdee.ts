import type { Goal, Sex } from "@/contracts";

/**
 * Local calorie-target preview for onboarding (MOBILE_ARCHITECTURE §4 — "local
 * TDEE preview, must match server formula"). The server remains the source of
 * truth; this exists so the onboarding "aha" number is instant. The backend's
 * `tdee.service` uses the same **Mifflin-St Jeor** equation
 * (SYSTEM_DESIGN.md §"Server computes TDEE + daily target (Mifflin-St Jeor)").
 *
 * Mifflin-St Jeor BMR (kcal/day), weight in kg, height in cm, age in years:
 *   male:   10·kg + 6.25·cm − 5·age + 5
 *   female: 10·kg + 6.25·cm − 5·age − 161
 * TDEE = BMR × activity factor; daily target = TDEE + goal adjustment.
 */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

/** Standard Mifflin-St Jeor activity multipliers. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Onboarding collects no activity level, so the preview defaults to sedentary. */
export const DEFAULT_ACTIVITY: ActivityLevel = "sedentary";

export interface BmrInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function bmrMifflinStJeor({ sex, weightKg, heightCm, ageYears }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return base - 78;
}

/** Daily kcal delta for the goal: ~0.5 kg/week deficit for loss, surplus for gain. */
export function goalAdjustmentKcal(goal: Goal): number {
  switch (goal) {
    case "lose":
      return -500;
    case "gain":
      return 300;
    case "maintain":
      return 0;
  }
}

const round10 = (n: number): number => Math.round(n / 10) * 10;

export interface TargetInput extends BmrInput {
  goal: Goal;
  activity?: ActivityLevel;
}

export interface CalorieBreakdown {
  bmr: number;
  activity: ActivityLevel;
  activityFactor: number;
  /** TDEE before the goal adjustment (bmr × activity factor). */
  maintenanceKcal: number;
  goalAdjustmentKcal: number;
  dailyTargetKcal: number;
}

/**
 * Full breakdown so the target screen can show each line (BMR → ×activity →
 * ± goal → final). The final target is rounded to the nearest 10 kcal.
 */
export function calorieTarget(input: TargetInput): CalorieBreakdown {
  const activity = input.activity ?? DEFAULT_ACTIVITY;
  const activityFactor = ACTIVITY_FACTORS[activity];
  const bmr = Math.round(bmrMifflinStJeor(input));
  const maintenanceKcal = Math.round(bmr * activityFactor);
  const adjustment = goalAdjustmentKcal(input.goal);
  return {
    bmr,
    activity,
    activityFactor,
    maintenanceKcal,
    goalAdjustmentKcal: adjustment,
    dailyTargetKcal: round10(maintenanceKcal + adjustment),
  };
}

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Split daily calories into macro grams using a balanced 30% protein / 40%
 * carbs / 30% fat ratio (4/4/9 kcal per gram).
 */
export function deriveMacroTargets(kcal: number): MacroTargets {
  return {
    proteinG: Math.round((kcal * 0.3) / 4),
    carbsG: Math.round((kcal * 0.4) / 4),
    fatG: Math.round((kcal * 0.3) / 9),
  };
}
