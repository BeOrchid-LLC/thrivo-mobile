import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button } from "@/components";
import type { Goal } from "@/contracts";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import type { OnboardingStepProps } from "../types";

const GOALS: { value: Goal; label: string }[] = [
  { value: "lose", label: "Lose Weight" },
  { value: "maintain", label: "Maintain Weight" },
  { value: "gain", label: "Build Muscle" },
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
    const fields = { goal, onboardingStep: 1 as const };
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
    if (goal) setFields({ goal, onboardingStep: 1 });
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: 1,
      fields: goal ? { goal } : undefined,
    });
  };

  return (
    <OnboardingStep
      step={1}
      title="What are your fitness goals?"
      subtitle="We'll help you stay on track."
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
            label={mode === "revisit" ? "Done later" : "Skip For Now"}
            variant="outline"
            loading={mode === "initial" && isPending}
            onPress={skip}
          />
        </>
      }
    >
      {GOALS.map((item) => (
        <SelectCard
          key={item.value}
          variant="plain"
          label={item.label}
          selected={goal === item.value}
          onPress={() => setGoal(item.value)}
        />
      ))}
    </OnboardingStep>
  );
}
