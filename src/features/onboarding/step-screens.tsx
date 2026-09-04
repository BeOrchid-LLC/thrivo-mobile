import BodyStep from "./screens/BodyStep";
import GoalStep from "./screens/GoalStep";
import NameStep from "./screens/NameStep";
import NotificationsStep from "./screens/NotificationsStep";
import StartFreeStep from "./screens/StartFreeStep";
import TargetStep from "./screens/TargetStep";
import WeightStep from "./screens/WeightStep";
import { ONBOARDING_STEPS, type OnboardingStepKey } from "./config";
import type { OnboardingStepProps } from "./types";

type StepScreen = (props: OnboardingStepProps) => React.ReactNode;

/**
 * Keyed by step *key*, not by number: the numbers come from `ONBOARDING_STEPS`
 * below, so inserting a step re-indexes this map instead of silently pointing a
 * number at the wrong screen. The record is exhaustive over the key union, so a
 * new key fails to compile until its screen exists.
 */
const SCREEN_FOR_KEY: Record<OnboardingStepKey, StepScreen> = {
  name: (props) => <NameStep {...props} />,
  goal: (props) => <GoalStep {...props} />,
  weight: (props) => <WeightStep {...props} />,
  body: (props) => <BodyStep {...props} />,
  target: (props) => <TargetStep {...props} />,
  "start-free": (props) => <StartFreeStep {...props} />,
  notifications: (props) => <NotificationsStep {...props} />,
};

/** The same screens by 1-based step number, for the callers that hold a number. */
export const STEP_SCREENS: Record<number, StepScreen> = Object.fromEntries(
  ONBOARDING_STEPS.map(({ key, step }) => [step, SCREEN_FOR_KEY[key]])
);
