import { useState } from "react";
import { router } from "expo-router";
import { Button, DumbbellIcon, SwapIcon, TrendDownIcon, type IconProps } from "@/components";
import type { ComponentType } from "react";
import type { Goal } from "@/contracts";
import { useOnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

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

/** S3 — Figma "What are your fitness goals?". */
export default function GoalStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboarded } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [goal, setGoal] = useState<Goal | undefined>(draft.goal);

  const next = () => {
    if (goal) setFields({ goal, onboardingStep: 2 });
    router.push("/(onboarding)/weight");
  };

  const skip = () => {
    if (goal) setFields({ goal, onboardingStep: 2 });
    setIsOnboarded(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 2, fields: goal ? { goal } : undefined });
  };

  return (
    <OnboardingStep
      step={2}
      title="What's your goal?"
      subtitle="This sets your calorie target and experience."
      footer={
        <>
          <Button label="Continue" disabled={!goal} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
        </>
      }
    >
      {GOALS.map((g) => (
        <SelectCard
          key={g.value}
          label={g.label}
          description={g.description}
          icon={g.icon}
          selected={goal === g.value}
          onPress={() => setGoal(g.value)}
        />
      ))}
    </OnboardingStep>
  );
}
