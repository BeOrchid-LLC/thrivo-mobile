import type { User } from "@/contracts";
import { isSeededName } from "./name";
import {
  ONBOARDING_STEPS,
  STEP_NUMBER,
  TOTAL_ONBOARDING_STEPS,
  type OnboardingStepKey,
} from "../config";

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
    case "name":
      // Two signals, because neither stands alone. `onboardingStep` cannot say
      // it: the column defaults to *this step's own number*, so the step writing
      // it is a no-op (`Math.max(1, 1)`) and the row could never tick — which
      // locked every step under it, since the loop below stops at the first
      // incomplete one. The name can say it, because answering the step is the
      // only thing that changes it away from the server's sign-up seed. The
      // counter stays as the fallback for the person whose real first name is
      // their email's local part.
      return !isSeededName(user) || user.onboardingStep > STEP_NUMBER.name;
    case "goal":
      return user.goal !== null;
    case "weight":
      return hasWeightData(user);
    case "body":
      return user.heightCm !== null && user.age !== null && user.sex !== null;
    case "target":
      return hasTargetData(user);
    case "start-free":
      // Nothing on the profile records that the premium preview was seen, so the
      // step counter is the only evidence it is behind the user.
      return user.onboardingStep >= STEP_NUMBER["start-free"];
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
