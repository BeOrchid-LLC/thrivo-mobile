export type OnboardingStepKey =
  | "goal"
  | "weight"
  | "body"
  | "target"
  | "start-free"
  | "notifications";

export interface OnboardingStepDefinition {
  key: OnboardingStepKey;
  step: number;
  title: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
  { key: "goal", step: 1, title: "Your goal" },
  { key: "weight", step: 2, title: "Your weight" },
  { key: "body", step: 3, title: "Your body" },
  { key: "target", step: 4, title: "Your calorie target" },
  { key: "start-free", step: 5, title: "Premium preview" },
  { key: "notifications", step: 6, title: "Daily reminders" },
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

/** The step value written to the server once every step is behind the user. */
export const ONBOARDING_COMPLETE_STEP = TOTAL_ONBOARDING_STEPS + 1;
