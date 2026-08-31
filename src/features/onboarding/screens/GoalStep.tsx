import { useEffect, useState, type ComponentType } from "react";
import { router } from "expo-router";
import { Button, DumbbellIcon, SwapIcon, TrendDownIcon, type IconProps } from "@/components";
import type { Goal } from "@/contracts";
import { spacing } from "@/theme";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { STEP_NUMBER } from "../config";
import type { OnboardingStepProps } from "../types";

const STEP = STEP_NUMBER.goal;

interface GoalOption {
  value: Goal;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
}

/**
 * Copy and glyphs from Figma "Onboarding S2". The description is what makes the
 * choice a decision rather than three words — the frame's annotation is explicit
 * that this answer drives the TDEE modifier computed on the target step, and
 * whether the weight step asks for a target weight at all.
 */
const GOALS: GoalOption[] = [
  {
    value: "lose",
    label: "Lose weight",
    description: "Reach a lower, healthier weight",
    icon: TrendDownIcon,
  },
  {
    value: "maintain",
    label: "Maintain weight",
    description: "Stay at your current weight",
    icon: SwapIcon,
  },
  {
    value: "gain",
    label: "Build muscle",
    description: "Gain lean mass with a calorie surplus",
    icon: DumbbellIcon,
  },
];

export default function GoalStep({
  mode = "initial",
  onNext,
  onDone,
  onBack,
  isSaving,
  variant,
}: OnboardingStepProps) {
  const { draft } = useOnboardingPrefill();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboardingSkipped } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [goal, setGoal] = useState<Goal | undefined>(draft.goal);

  useEffect(() => {
    if (draft.goal) setGoal(draft.goal);
  }, [draft.goal]);

  const next = () => {
    if (!goal) return;
    const fields = { goal, onboardingStep: STEP };
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    router.push("/(onboarding)/weight");
  };

  const skip = () => {
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    if (goal) setFields({ goal, onboardingStep: STEP });
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: STEP,
      fields: goal ? { goal } : undefined,
    });
  };

  return (
    <OnboardingStep
      step={STEP}
      // Figma S2 sets the option cards 12 apart, tighter than the page default.
      contentGap={spacing.md}
      title="What's your goal?"
      subtitle="This sets your calorie target and experience."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label="Continue"
            disabled={!goal}
            loading={isPending || isSaving}
            onPress={next}
          />
          <Button
            label="Skip for now"
            variant="ghost"
            loading={mode === "initial" && isPending}
            onPress={skip}
          />
        </>
      }
    >
      {GOALS.map((item) => (
        <SelectCard
          key={item.value}
          icon={item.icon}
          label={item.label}
          description={item.description}
          selected={goal === item.value}
          onPress={() => setGoal(item.value)}
        />
      ))}
    </OnboardingStep>
  );
}
