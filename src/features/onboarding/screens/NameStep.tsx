import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Button, Input } from "@/components";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import type { OnboardingStepProps } from "../types";

export default function NameStep({
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
  const [name, setName] = useState(draft.firstName ?? "");
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current && draft.firstName) setName(draft.firstName);
  }, [draft.firstName]);

  const trimmed = name.trim();

  const next = () => {
    if (!trimmed) return;
    const fields = { firstName: trimmed, onboardingStep: 1 as const };
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    router.push("/(onboarding)/goal");
  };

  const skip = () => {
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    if (trimmed) setFields({ firstName: trimmed, onboardingStep: 1 });
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: 1,
      fields: trimmed ? { firstName: trimmed } : undefined,
    });
  };

  return (
    <OnboardingStep
      step={1}
      title="What should we call you?"
      subtitle="We'll use this name throughout the app."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={mode === "revisit" ? "Save and continue" : "Continue"}
            disabled={!trimmed}
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
      <Input
        label="Name"
        uppercaseLabel
        placeholder="Ada Lovelace"
        autoCapitalize="words"
        autoComplete="name"
        value={name}
        onChangeText={(value) => {
          dirty.current = true;
          setName(value);
        }}
        returnKeyType="next"
        onSubmitEditing={next}
      />
    </OnboardingStep>
  );
}
