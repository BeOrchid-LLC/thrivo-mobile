import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, DumbbellIcon, SwapIcon, TrendDownIcon, type IconProps } from "@/components";
import type { ComponentType } from "react";
import type { Goal } from "@/contracts";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import type { OnboardingStepProps } from "../types";

const GOALS: {
  value: Goal;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
}[] = [
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
    const fields = { goal, onboardingStep: 2 as const };
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
    if (goal) setFields({ goal, onboardingStep: 2 });
    setIsOnboardingSkipped(true);
    router.replace("/(app)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: 2,
      fields: goal ? { goal } : undefined,
    });
  };

  return (
    <OnboardingStep
      step={2}
      title="What's your goal?"
      subtitle="This sets your calorie target and experience."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={mode === "revisit" ? "Save and continue" : "Continue"}
            disabled={!goal}
            loading={isPending || isSaving}
            onPress={next}
          />
          <Button
            label={mode === "revisit" ? "Done later" : "Skip for now"}
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
          label={item.label}
          description={item.description}
          icon={item.icon}
          selected={goal === item.value}
          onPress={() => setGoal(item.value)}
        />
      ))}
    </OnboardingStep>
  );
}
