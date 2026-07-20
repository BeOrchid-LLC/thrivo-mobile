import type { OnboardingDraft } from "@/stores";

export type OnboardingMode = "initial" | "revisit";

export interface OnboardingStepProps {
  mode?: OnboardingMode;
  onNext?: (fields: Partial<OnboardingDraft>) => void | Promise<void>;
  onDone?: () => void;
  onBack?: () => void;
  isSaving?: boolean;
  /** "settings" suppresses the gradient and progress bar chrome (re-use from Settings hub). */
  variant?: "onboarding" | "settings";
}
