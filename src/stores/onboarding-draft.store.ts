import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActivityLevel, Goal, Sex, UnitSystem } from "@/contracts";

/**
 * The multi-screen onboarding form draft (MOBILE_ARCHITECTURE §4.2). Keeps
 * answers from the reusable onboarding flow in local storage so back/forward
 * navigation, cold starts, and later lifecycle revisits do not lose progress.
 * Server remains the source of truth once skip/complete/start trial submits.
 *
 * PII policy (CLAUDE.md — AsyncStorage is for NON-sensitive data only): the
 * health-adjacent body metrics (weight/height/age/sex) live in memory for the
 * session but are **never written to disk**. They survive in-flow navigation but
 * not a cold start mid-onboarding — an accepted trade-off vs. persisting health
 * PII in plaintext. See `PERSISTED_FIELDS`.
 */
export interface OnboardingDraft {
  firstName?: string;
  goal?: Goal;
  currentWeightKg?: number;
  targetWeightKg?: number;
  heightCm?: number;
  ageYears?: number;
  sex?: Sex;
  unitSystem?: UnitSystem;
  activityLevel?: ActivityLevel;
  manualDailyTargetKcal?: number;
  notifyTimes?: string[];
  timezone?: string;
  onboardingStep?: number;
}

/**
 * Fields safe to persist to AsyncStorage — navigation/progress + non-sensitive
 * preferences. Body metrics are deliberately excluded (health PII). Update this
 * list, not `partialize`, when adding a draft field.
 */
const PERSISTED_FIELDS: (keyof OnboardingDraft)[] = [
  "firstName",
  "goal",
  "unitSystem",
  "activityLevel",
  "notifyTimes",
  "timezone",
  "onboardingStep",
];

function persistableDraft(draft: OnboardingDraft): Partial<OnboardingDraft> {
  const out: Partial<OnboardingDraft> = {};
  for (const key of PERSISTED_FIELDS) {
    if (draft[key] !== undefined) {
      // Per-key copy keeps the union types intact without a blanket cast.
      (out as Record<string, unknown>)[key] = draft[key];
    }
  }
  return out;
}

interface OnboardingDraftState {
  draft: OnboardingDraft;
  actions: {
    /** Merge a partial update into the draft. */
    setFields: (fields: Partial<OnboardingDraft>) => void;
    reset: () => void;
  };
}

export const useOnboardingDraftStore = create<OnboardingDraftState>()(
  persist(
    (set) => ({
      draft: {},
      actions: {
        setFields: (fields) => set((state) => ({ draft: { ...state.draft, ...fields } })),
        reset: () => set({ draft: {} }),
      },
    }),
    {
      name: "thrivo.onboarding-draft",
      storage: createJSONStorage(() => AsyncStorage),
      // Only non-sensitive fields reach disk — body metrics stay in memory.
      partialize: (state) => ({ draft: persistableDraft(state.draft) }),
    }
  )
);

export const useOnboardingDraft = () => useOnboardingDraftStore((s) => s.draft);
export const useOnboardingDraftActions = () => useOnboardingDraftStore((s) => s.actions);
