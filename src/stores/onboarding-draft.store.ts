import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActivityLevel, Goal, Sex, UnitSystem } from "@/contracts";

/**
 * The multi-screen onboarding form draft (MOBILE_ARCHITECTURE §4.2). Keeps
 * answers from the reusable onboarding flow in local storage so back/forward
 * navigation, cold starts, and later lifecycle revisits do not lose progress.
 * Server remains the source of truth once skip/complete/start trial submits.
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
      partialize: (state) => ({ draft: state.draft }),
    }
  )
);

export const useOnboardingDraft = () => useOnboardingDraftStore((s) => s.draft);
export const useOnboardingDraftActions = () => useOnboardingDraftStore((s) => s.actions);
