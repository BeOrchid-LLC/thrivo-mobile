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

/**
 * Each step's position in the flow, by key.
 *
 * Screens read their number from here rather than writing it inline: the
 * literals were duplicated three or four times per screen (the progress bar, the
 * `onboardingStep` written on Continue, and again on Skip), so inserting a step
 * meant editing ~20 numbers by hand and silently mis-numbering the progress bar
 * if one was missed. The order above is now the only place a step number lives.
 */
export const STEP_NUMBER = Object.fromEntries(
  ONBOARDING_STEPS.map(({ key, step }) => [key, step])
) as Record<OnboardingStepKey, number>;

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

/** The step value written to the server once every step is behind the user. */
export const ONBOARDING_COMPLETE_STEP = TOTAL_ONBOARDING_STEPS + 1;
