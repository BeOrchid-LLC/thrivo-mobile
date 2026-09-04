import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Input } from "@/components";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { STEP_NUMBER } from "../config";
import type { OnboardingStepProps } from "../types";

const STEP = STEP_NUMBER.name;

/**
 * The field's own ceiling. The contract asks only for a non-empty string
 * (`firstName: z.string().trim().min(1)`), so this is about the field staying
 * readable on one line, not about what the server will store.
 */
const MAX_NAME_LENGTH = 60;

/**
 * Onboarding S1 — "What should we call you?".
 *
 * The first thing the flow asks for, and the only one that is not health data:
 * it is a greeting, so skipping it costs the user nothing but a generic
 * dashboard. It writes `firstName`, which the profile contract has carried since
 * before this screen existed — the server stores it as the user's `name`.
 */
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
  const [firstName, setFirstName] = useState(draft.firstName ?? "");

  useEffect(() => {
    if (draft.firstName) setFirstName(draft.firstName);
  }, [draft.firstName]);

  // The contract trims before validating, so " " is empty as far as the server
  // is concerned — Continue has to agree with it.
  const trimmed = firstName.trim();
  const isValid = trimmed.length > 0;

  const next = () => {
    if (!isValid) return;
    const fields = { firstName: trimmed, onboardingStep: STEP };
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
    // Whatever was typed before the skip is still an answer — keep it rather
    // than throwing it away on the way to the dashboard.
    if (isValid) setFields({ firstName: trimmed, onboardingStep: STEP });
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: STEP,
      fields: isValid ? { firstName: trimmed } : undefined,
    });
  };

  return (
    <OnboardingStep
      step={STEP}
      title="What should we call you?"
      subtitle="We'll use this name throughout the app."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label="Continue"
            disabled={!isValid}
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
      <Input
        label="First name"
        uppercaseLabel
        variant="onboarding"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Alex"
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={next}
      />
    </OnboardingStep>
  );
}
