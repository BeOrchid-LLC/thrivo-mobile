export type OnboardingStepKey =
  | "name"
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
  { key: "name", step: 1, title: "Your name" },
  { key: "goal", step: 2, title: "Your goal" },
  { key: "weight", step: 3, title: "Your weight" },
  { key: "body", step: 4, title: "Your body" },
  { key: "target", step: 5, title: "Your calorie target" },
  { key: "start-free", step: 6, title: "Premium preview" },
  { key: "notifications", step: 7, title: "Daily reminders" },
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;
