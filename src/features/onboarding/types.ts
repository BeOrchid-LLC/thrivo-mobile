import type { OnboardingDraft } from "@/stores";

export type OnboardingMode = "initial" | "revisit";

export interface OnboardingStepProps {
  mode?: OnboardingMode;
  onNext?: (fields: Partial<OnboardingDraft>) => void | Promise<void>;
  onDone?: () => void;
  onBack?: () => void;
  isSaving?: boolean;
}
