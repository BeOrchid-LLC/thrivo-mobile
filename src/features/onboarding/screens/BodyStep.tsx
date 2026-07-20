import { useEffect, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Input, RadioGroup, Segmented, Text } from "@/components";
import type { Sex, UnitSystem } from "@/contracts";
import { roundTo } from "@/utils";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { NoteBox } from "@/features/onboarding/components/NoteBox";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { isValidAgeYears, isValidHeightCm } from "@/features/onboarding/utils/validation";
import type { OnboardingStepProps } from "../types";

type HeightUnit = "metric" | "imperial";
const CM_PER_IN = 2.54;

const cmToFtIn = (cm: number): { ft: number; inch: number } => {
  const totalIn = Math.round(cm / CM_PER_IN);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return inch === 12 ? { ft: ft + 1, inch: 0 } : { ft, inch };
};

const ftInToCm = (ft: number, inch: number): number => roundTo((ft * 12 + inch) * CM_PER_IN);

export default function BodyStep({
  mode = "initial",
  onNext,
  onDone,
  onBack,
  isSaving,
  variant,
}: OnboardingStepProps) {
  const { draft, settings } = useOnboardingPrefill();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboardingSkipped } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const initialFtIn = draft.heightCm ? cmToFtIn(draft.heightCm) : null;
  const initialUnit =
    (draft.unitSystem ?? settings?.unitSystem) === "imperial" ? "imperial" : "metric";
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(initialUnit);
  const [cm, setCm] = useState(draft.heightCm ? String(roundTo(draft.heightCm)) : "");
  const [ft, setFt] = useState(initialFtIn ? String(initialFtIn.ft) : "");
  const [inch, setInch] = useState(initialFtIn ? String(initialFtIn.inch) : "");
  const [age, setAge] = useState(draft.ageYears ? String(draft.ageYears) : "");
  const [sex, setSex] = useState<Sex | undefined>(draft.sex);

  useEffect(() => {
    if (!cm && draft.heightCm && heightUnit === "metric") setCm(String(roundTo(draft.heightCm)));
    if (!ft && initialFtIn && heightUnit === "imperial") setFt(String(initialFtIn.ft));
    if (!inch && initialFtIn && heightUnit === "imperial") setInch(String(initialFtIn.inch));
    if (!age && draft.ageYears) setAge(String(draft.ageYears));
    if (!sex && draft.sex) setSex(draft.sex);
  }, [age, cm, draft.ageYears, draft.heightCm, draft.sex, ft, heightUnit, inch, initialFtIn, sex]);

  const heightCm =
    heightUnit === "metric"
      ? Number.parseFloat(cm)
      : Number.parseFloat(ft) > 0
        ? ftInToCm(Number.parseFloat(ft), Number.parseFloat(inch) || 0)
        : Number.NaN;
  const ageNum = Number.parseInt(age, 10);
  const valid = isValidHeightCm(heightCm) && isValidAgeYears(ageNum) && sex !== undefined;

  const switchHeightUnit = (next: HeightUnit) => {
    if (next === heightUnit) return;
    if (next === "imperial") {
      const value = Number.parseFloat(cm);
      if (value > 0) {
        const converted = cmToFtIn(value);
        setFt(String(converted.ft));
        setInch(String(converted.inch));
      }
    } else {
      const value = Number.parseFloat(ft);
      if (value > 0) setCm(String(ftInToCm(value, Number.parseFloat(inch) || 0)));
    }
    setHeightUnit(next);
  };

  const buildFields = (): Partial<OnboardingDraft> => ({
    heightCm: heightCm > 0 ? roundTo(heightCm) : undefined,
    ageYears: ageNum >= 13 ? ageNum : undefined,
    sex,
    unitSystem: heightUnit satisfies UnitSystem,
    onboardingStep: 4,
  });

  const next = () => {
    if (!valid) return;
    const fields = buildFields();
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    router.push("/(onboarding)/target");
  };

  const skip = () => {
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    const fields = buildFields();
    setFields(fields);
    setIsOnboardingSkipped(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 4, fields });
  };

  return (
    <OnboardingStep
      step={4}
      title="A bit more about your body"
      subtitle="Used only for your calorie formula."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={mode === "revisit" ? "Save and continue" : "Continue"}
            disabled={!valid}
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
      <View className="gap-sm">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" color="muted" className="uppercase tracking-[0.78px]">
            Height
          </Text>
          <View className="w-[132px]">
            <Segmented<HeightUnit>
              options={[
                { label: "ft + in", value: "imperial" },
                { label: "cm", value: "metric" },
              ]}
              value={heightUnit}
              onChange={switchHeightUnit}
            />
          </View>
        </View>
        {heightUnit === "imperial" ? (
          <View className="flex-row gap-md">
            <View className="flex-1">
              <Input
                trailingText="ft"
                placeholder="5"
                keyboardType="number-pad"
                value={ft}
                onChangeText={setFt}
              />
            </View>
            <View className="flex-1">
              <Input
                trailingText="in"
                placeholder="10"
                keyboardType="number-pad"
                value={inch}
                onChangeText={setInch}
              />
            </View>
          </View>
        ) : (
          <Input
            trailingText="cm"
            placeholder="170"
            keyboardType="number-pad"
            value={cm}
            onChangeText={setCm}
          />
        )}
      </View>

      <Input
        label="Age"
        uppercaseLabel
        trailingText="yrs"
        placeholder="30"
        keyboardType="number-pad"
        value={age}
        onChangeText={setAge}
      />

      <View className="gap-sm">
        <Text variant="caption" color="muted" className="uppercase tracking-[0.78px]">
          Sex
        </Text>
        <RadioGroup<Sex>
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Prefer not to say", value: "prefer_not_to_say" },
          ]}
          value={sex}
          onChange={setSex}
        />
        <NoteBox>
          We ask about biological sex because it affects metabolic rate. &quot;Prefer not to
          say&quot; uses an averaged BMR.
        </NoteBox>
      </View>
    </OnboardingStep>
  );
}
