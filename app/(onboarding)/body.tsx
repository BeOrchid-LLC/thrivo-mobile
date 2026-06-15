import { useState } from "react";
import { router } from "expo-router";
import { Button, Input, Segmented, Text } from "@/components";
import type { Sex } from "@/contracts";
import { roundTo } from "@/utils";
import { useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";

/** S5 — Figma "A bit more about you" (height, age, sex). Sex is biological, for BMR. */
export default function BodyStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();

  const [height, setHeight] = useState(draft.heightCm ? String(roundTo(draft.heightCm)) : "");
  const [age, setAge] = useState(draft.ageYears ? String(draft.ageYears) : "");
  const [sex, setSex] = useState<Sex | undefined>(draft.sex);

  const heightNum = Number.parseFloat(height);
  const ageNum = Number.parseInt(age, 10);
  const valid = heightNum > 0 && ageNum > 0 && sex !== undefined;

  const next = () => {
    if (valid) {
      setFields({ heightCm: roundTo(heightNum), ageYears: ageNum, sex });
    }
    router.push("/(onboarding)/target");
  };

  return (
    <OnboardingStep
      step={5}
      title="A bit more about you"
      subtitle="This helps us calculate a personalized path to your goal."
      footer={
        <>
          <Button label="Continue" disabled={!valid} onPress={next} />
          <Button label="Skip for now" variant="ghost" onPress={next} />
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
        ]}
        value={sex}
        onChange={setSex}
      />
    </OnboardingStep>
  );
}
