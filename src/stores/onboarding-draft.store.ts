import { create } from "zustand";
import type { Goal, Sex, UnitSystem } from "@/contracts";

/**
 * The multi-screen onboarding form draft (MOBILE_ARCHITECTURE §4.2). Keeps
 * answers from screens S3–S6 in memory so back/forward navigation doesn't lose
 * data or hit the network per step. Persisted server-side only on completion.
 */
export interface OnboardingDraft {
  goal?: Goal;
  currentWeightKg?: number;
  targetWeightKg?: number;
  heightCm?: number;
  ageYears?: number;
  sex?: Sex;
  unitSystem?: UnitSystem;
}

interface OnboardingDraftState {
  draft: OnboardingDraft;
  actions: {
    /** Merge a partial update into the draft. */
    setFields: (fields: Partial<OnboardingDraft>) => void;
    reset: () => void;
  };
}

export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  draft: {},
  actions: {
    setFields: (fields) => set((state) => ({ draft: { ...state.draft, ...fields } })),
    reset: () => set({ draft: {} }),
  },
}));

export const useOnboardingDraft = () => useOnboardingDraftStore((s) => s.draft);
export const useOnboardingDraftActions = () => useOnboardingDraftStore((s) => s.actions);
