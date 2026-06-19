import { useState } from "react";
import { router } from "expo-router";
import { Button } from "@/components";
import type { Goal } from "@/contracts";
import { useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: "lose", label: "Lose weight", description: "Eat at a calorie deficit" },
  { value: "maintain", label: "Maintain weight", description: "Stay at your current weight" },
  { value: "gain", label: "Build muscle", description: "Eat at a calorie surplus" },
];

/** S3 — Figma "What are your fitness goals?". */
export default function GoalStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [goal, setGoal] = useState<Goal | undefined>(draft.goal);

  const next = () => {
    if (goal) setFields({ goal, onboardingStep: 2 });
    router.push("/(onboarding)/weight");
  };

  const skip = async () => {
    if (goal) {
      setFields({ goal, onboardingStep: 2 });
    }
    await submit("skip", {
      silent: true,
      onboardingStep: 2,
      fields: goal ? { goal } : undefined,
    });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={2}
      title="What's your main goal?"
      subtitle="We'll tailor your daily calorie target to this."
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
          selected={goal === g.value}
          onPress={() => setGoal(g.value)}
        />
      ))}
    </OnboardingStep>
  );
}
