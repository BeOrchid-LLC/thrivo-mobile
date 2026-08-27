import type { User } from "@/contracts";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS, type OnboardingStepKey } from "../config";

export interface OnboardingProgress {
  status: "complete" | "incomplete";
  completedSteps: number;
  totalSteps: number;
  firstIncompleteStep: number | null;
  completed: Record<OnboardingStepKey, boolean>;
}

function hasWeightData(user: User): boolean {
  return user.weightKg !== null && (user.goal === "maintain" || user.targetWeightKg !== null);
}

function hasTargetData(user: User): boolean {
  return user.activityLevel !== null && user.dailyTargetKcal !== null;
}

function stepHasData(user: User, key: OnboardingStepKey): boolean {
  switch (key) {
    case "goal":
      return user.goal !== null;
    case "weight":
      return hasWeightData(user);
    case "body":
      return user.heightCm !== null && user.age !== null && user.sex !== null;
    case "target":
      return hasTargetData(user);
    case "start-free":
      return user.onboardingStep >= 5;
    case "notifications":
      return user.notifyTimes !== null && user.timezone !== null;
  }
}

export function getOnboardingProgress(user: User): OnboardingProgress {
  if (user.isOnboarded) {
    return {
      status: "complete",
      completedSteps: TOTAL_ONBOARDING_STEPS,
      totalSteps: TOTAL_ONBOARDING_STEPS,
      firstIncompleteStep: null,
      completed: Object.fromEntries(ONBOARDING_STEPS.map(({ key }) => [key, true])) as Record<
        OnboardingStepKey,
        boolean
      >,
    };
  }

  const completed = Object.fromEntries(ONBOARDING_STEPS.map(({ key }) => [key, false])) as Record<
    OnboardingStepKey,
    boolean
  >;
  let completedSteps = 0;
  for (const definition of ONBOARDING_STEPS) {
    const isComplete = stepHasData(user, definition.key);
    completed[definition.key] = isComplete;
    if (!isComplete || completedSteps !== definition.step - 1) break;
    completedSteps = definition.step;
  }

  return {
    status: "incomplete",
    completedSteps,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    firstIncompleteStep: completedSteps < TOTAL_ONBOARDING_STEPS ? completedSteps + 1 : null,
    completed,
  };
}
