import { useState } from "react";
import { router } from "expo-router";
import { Button, Input, Segmented, Text } from "@/components";
import type { Sex } from "@/contracts";
import { roundTo } from "@/utils";
import { type OnboardingDraft, useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

/** S5 — Figma "A bit more about you" (height, age, sex). Sex is biological, for BMR. */
export default function BodyStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();

  const [height, setHeight] = useState(draft.heightCm ? String(roundTo(draft.heightCm)) : "");
  const [age, setAge] = useState(draft.ageYears ? String(draft.ageYears) : "");
  const [sex, setSex] = useState<Sex | undefined>(draft.sex);

  const heightNum = Number.parseFloat(height);
  const ageNum = Number.parseInt(age, 10);
  const valid = heightNum > 0 && ageNum >= 13 && sex !== undefined;

  const buildFields = (): Partial<OnboardingDraft> => ({
    heightCm: heightNum > 0 ? roundTo(heightNum) : undefined,
    ageYears: ageNum >= 13 ? ageNum : undefined,
    sex,
    onboardingStep: 4,
  });

  const next = () => {
    if (valid) setFields(buildFields());
    router.push("/(onboarding)/target");
  };

  const skip = async () => {
    const fields = buildFields();
    setFields(fields);
    await submit("skip", { silent: true, onboardingStep: 4, fields });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={4}
      title="A bit more about you"
      subtitle="This helps us calculate a personalized path to your goal."
      footer={
        <>
          <Button label="Continue" disabled={!valid} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
        </>
      }
    >
      <Input
        label="Height (cm)"
        placeholder="170"
        keyboardType="number-pad"
        value={height}
        onChangeText={setHeight}
      />
      <Input
        label="Age"
        placeholder="30"
        keyboardType="number-pad"
        value={age}
        onChangeText={setAge}
      />
      <Text variant="caption" color="muted">
        Biological sex (used only for the BMR formula)
      </Text>
      <Segmented<Sex>
        options={[
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Prefer not to say", value: "prefer_not_to_say" },
        ]}
        value={sex}
        onChange={setSex}
      />
    </OnboardingStep>
  );
}
