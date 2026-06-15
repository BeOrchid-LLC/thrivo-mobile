import { create } from "zustand";
import type { Goal, MealType, Sex } from "@/contracts";
import {
  calorieTarget,
  deriveMacroTargets,
  type ActivityLevel,
  type MacroTargets,
} from "@/features/onboarding/utils/tdee";
import type { OnboardingDraft } from "./onboarding-draft.store";

/**
 * DEMO ONLY — stands in for the server's `/users/me` profile + targets and the
 * food diary so the dashboard has something to render without a backend. It is
 * seeded from the onboarding draft on completion. Delete this store (and its
 * callers) when the real API + TanStack Query wiring lands.
 */

export interface DemoMealItem {
  id: string;
  name: string;
  meal: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DemoProfile {
  goal: Goal;
  sex: Sex;
  heightCm: number;
  ageYears: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  bmr: number;
  activityFactor: number;
  maintenanceKcal: number;
  goalAdjustmentKcal: number;
  dailyTargetKcal: number;
  macroTargets: MacroTargets;
  streakDays: number;
}

/** Sensible fallbacks so the flow never dead-ends if a step was skipped. */
const DEMO_DEFAULTS = {
  goal: "maintain" as Goal,
  sex: "male" as Sex,
  heightCm: 170,
  ageYears: 30,
  currentWeightKg: 70,
  targetWeightKg: 65,
};

const seededEntries = (): DemoMealItem[] => [
  {
    id: "seed-1",
    name: "Greek yoghurt, 150g",
    meal: "breakfast",
    calories: 130,
    proteinG: 12,
    carbsG: 8,
    fatG: 4,
  },
  {
    id: "seed-2",
    name: "Banana",
    meal: "breakfast",
    calories: 90,
    proteinG: 1,
    carbsG: 23,
    fatG: 0,
  },
  {
    id: "seed-3",
    name: "Oat granola, 40g",
    meal: "breakfast",
    calories: 210,
    proteinG: 5,
    carbsG: 32,
    fatG: 7,
  },
  {
    id: "seed-4",
    name: "Chicken salad",
    meal: "lunch",
    calories: 420,
    proteinG: 35,
    carbsG: 20,
    fatG: 22,
  },
];

/** Preset appended by the dashboard's per-meal quick-add so the demo feels live. */
const QUICK_ADD: Omit<DemoMealItem, "id" | "meal"> = {
  name: "Apple, 1 medium",
  calories: 95,
  proteinG: 0,
  carbsG: 25,
  fatG: 0,
};

/** Compute the full demo profile (targets + breakdown) from a draft, filling
 *  any skipped fields with demo defaults. Exported so the target screen can
 *  preview the exact numbers the store will later seed. */
export function buildDemoProfile(draft: OnboardingDraft): DemoProfile {
  const goal = draft.goal ?? DEMO_DEFAULTS.goal;
  const sex = draft.sex ?? DEMO_DEFAULTS.sex;
  const heightCm = draft.heightCm ?? DEMO_DEFAULTS.heightCm;
  const ageYears = draft.ageYears ?? DEMO_DEFAULTS.ageYears;
  const currentWeightKg = draft.currentWeightKg ?? DEMO_DEFAULTS.currentWeightKg;
  const targetWeightKg = draft.targetWeightKg ?? DEMO_DEFAULTS.targetWeightKg;

  const breakdown = calorieTarget({ sex, weightKg: currentWeightKg, heightCm, ageYears, goal });

  return {
    goal,
    sex,
    heightCm,
    ageYears,
    currentWeightKg,
    targetWeightKg,
    activity: breakdown.activity,
    bmr: breakdown.bmr,
    activityFactor: breakdown.activityFactor,
    maintenanceKcal: breakdown.maintenanceKcal,
    goalAdjustmentKcal: breakdown.goalAdjustmentKcal,
    dailyTargetKcal: breakdown.dailyTargetKcal,
    macroTargets: deriveMacroTargets(breakdown.dailyTargetKcal),
    streakDays: 3,
  };
}

interface DemoProfileState {
  profile: DemoProfile | null;
  entries: DemoMealItem[];
  actions: {
    /** Compute targets from the onboarding draft and seed a starter diary. */
    seedFromDraft: (draft: OnboardingDraft) => void;
    /** Append the quick-add preset to a meal (dashboard demo interaction). */
    addQuickEntry: (meal: MealType) => void;
    reset: () => void;
  };
}

let quickAddCount = 0;

export const useDemoProfileStore = create<DemoProfileState>((set) => ({
  profile: null,
  entries: [],
  actions: {
    seedFromDraft: (draft) => set({ profile: buildDemoProfile(draft), entries: seededEntries() }),
    addQuickEntry: (meal) =>
      set((state) => ({
        entries: [...state.entries, { ...QUICK_ADD, id: `quick-${++quickAddCount}`, meal }],
      })),
    reset: () => set({ profile: null, entries: [] }),
  },
}));

export const useDemoProfile = () => useDemoProfileStore((s) => s.profile);
export const useDemoEntries = () => useDemoProfileStore((s) => s.entries);
export const useDemoProfileActions = () => useDemoProfileStore((s) => s.actions);
