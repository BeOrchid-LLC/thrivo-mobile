import {
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  bmrMifflinStJeor,
  calculateTdee,
  macroSplitFromKcal,
  type ActivityLevel,
  type BmrInput,
  type Goal,
  type MacroSplit,
} from "@beorchid-llc/thrivo-contracts";

/**
 * Local calorie-target preview for onboarding (MOBILE_ARCHITECTURE §4 — "local
 * TDEE preview, must match server formula"). The server remains the source of
 * truth; this exists so the onboarding "aha" number is instant.
 *
 * R6 (I19): the formula itself (Mifflin-St Jeor, activity factors, goal
 * adjustment, macro split) now lives once in `@beorchid-llc/thrivo-contracts`
 * — this module is a thin wrapper mapping the shared result onto the field
 * names the onboarding target screen already renders (`activity`,
 * `activityFactor`, `maintenanceKcal`), not a second implementation.
 */

export type { ActivityLevel, BmrInput };
export { ACTIVITY_FACTORS, bmrMifflinStJeor };

/** Onboarding collects no activity level, so the preview defaults to sedentary. */
export const DEFAULT_ACTIVITY: ActivityLevel = "sedentary";

/** Daily kcal delta for the goal: ~0.5 kg/week deficit for loss, surplus for gain. */
export function goalAdjustmentKcal(goal: Goal): number {
  return GOAL_ADJUSTMENTS[goal];
}

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
  const result = calculateTdee({ ...input, activityLevel: activity });
  return {
    bmr: result.bmr,
    activity: result.activityLevel,
    activityFactor: ACTIVITY_FACTORS[activity],
    maintenanceKcal: result.tdeeKcal,
    goalAdjustmentKcal: result.goalAdjustmentKcal,
    dailyTargetKcal: result.dailyTargetKcal,
  };
}

export type MacroTargets = MacroSplit;

/**
 * Split daily calories into macro grams using a balanced 30% protein / 40%
 * carbs / 30% fat ratio (4/4/9 kcal per gram).
 */
export function deriveMacroTargets(kcal: number): MacroTargets {
  return macroSplitFromKcal(kcal);
}
