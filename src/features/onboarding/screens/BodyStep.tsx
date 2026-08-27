import { useEffect, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Input, SelectInput, SelectSheet, Text } from "@/components";
import type { Sex, UnitSystem } from "@/contracts";
import { roundTo } from "@/utils";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { UnitChips } from "@/features/onboarding/components/UnitChips";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import {
  AGE_RANGE_YEARS,
  HEIGHT_RANGE_CM,
  isValidAgeYears,
  isValidHeightCm,
  parseDecimal,
  parsePositiveInteger,
} from "@/features/onboarding/utils/validation";
import type { OnboardingStepProps } from "../types";

type HeightUnit = "metric" | "imperial";
const CM_PER_IN = 2.54;

const HEIGHT_UNITS = [
  { label: "cm", value: "metric" },
  { label: "ft. in.", value: "imperial" },
] as const satisfies readonly { label: string; value: HeightUnit }[];

const SEX_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
] as const satisfies readonly { label: string; value: Sex }[];

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
  const [sexSheetOpen, setSexSheetOpen] = useState(false);

  useEffect(() => {
    if (!cm && draft.heightCm && heightUnit === "metric") setCm(String(roundTo(draft.heightCm)));
    if (!ft && initialFtIn && heightUnit === "imperial") setFt(String(initialFtIn.ft));
    if (!inch && initialFtIn && heightUnit === "imperial") setInch(String(initialFtIn.inch));
    if (!age && draft.ageYears) setAge(String(draft.ageYears));
    if (!sex && draft.sex) setSex(draft.sex);
  }, [age, cm, draft.ageYears, draft.heightCm, draft.sex, ft, heightUnit, inch, initialFtIn, sex]);

  const ftNum = parseDecimal(ft);
  const inchNum = parseDecimal(inch);
  const heightCm =
    heightUnit === "metric"
      ? (parseDecimal(cm) ?? Number.NaN)
      : ftNum !== undefined && ftNum > 0 && (inch.trim().length === 0 || inchNum !== undefined)
        ? ftInToCm(ftNum, inchNum ?? 0)
        : Number.NaN;
  const ageNum = parsePositiveInteger(age) ?? Number.NaN;
  const valid = isValidHeightCm(heightCm) && isValidAgeYears(ageNum) && sex !== undefined;

  /**
   * The keypad is a hint, not a restriction, so each field states what is wrong
   * with what it holds instead of leaving Continue disabled with no reason. An
   * untouched field says nothing.
   */
  const heightError = (): string | undefined => {
    const entered = heightUnit === "metric" ? cm : `${ft}${inch}`;
    if (entered.trim().length === 0) return undefined;
    if (Number.isNaN(heightCm)) return "Numbers only";
    if (!isValidHeightCm(heightCm)) {
      const feet = (cm: number) => {
        const { ft: feetPart, inch: inchPart } = cmToFtIn(cm);
        return `${feetPart}'${inchPart}"`;
      };
      return heightUnit === "metric"
        ? `Enter ${HEIGHT_RANGE_CM.min}–${HEIGHT_RANGE_CM.max} cm`
        : `Enter ${feet(HEIGHT_RANGE_CM.min)}–${feet(HEIGHT_RANGE_CM.max)}`;
    }
    return undefined;
  };

  const ageError = (): string | undefined => {
    if (age.trim().length === 0) return undefined;
    if (Number.isNaN(ageNum)) return "Numbers only";
    if (!isValidAgeYears(ageNum)) return `Enter ${AGE_RANGE_YEARS.min}–${AGE_RANGE_YEARS.max}`;
    return undefined;
  };

  const switchHeightUnit = (next: HeightUnit) => {
    if (next === heightUnit) return;
    if (next === "imperial") {
      const value = parseDecimal(cm) ?? Number.NaN;
      if (value > 0) {
        const converted = cmToFtIn(value);
        setFt(String(converted.ft));
        setInch(String(converted.inch));
      }
    } else {
      const value = parseDecimal(ft) ?? Number.NaN;
      if (value > 0) setCm(String(ftInToCm(value, parseDecimal(inch) ?? 0)));
    }
    setHeightUnit(next);
  };

  const buildFields = (): Partial<OnboardingDraft> => ({
    heightCm: heightCm > 0 ? roundTo(heightCm) : undefined,
    ageYears: ageNum >= 13 ? ageNum : undefined,
    sex,
    unitSystem: heightUnit satisfies UnitSystem,
    onboardingStep: 3,
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
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 3, fields });
  };

  return (
    <OnboardingStep
      step={3}
      contentGap={22}
      title="A bit more about you"
      subtitle="This will help us customize a path for your fitness journey"
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
            label={mode === "revisit" ? "Done later" : "Skip For Now"}
            variant="outline"
            loading={mode === "initial" && isPending}
            onPress={skip}
          />
        </>
      }
    >
      <View className="gap-xs">
        <Text variant="caption" color="dark">
          Height
        </Text>
        <View className="flex-row items-center gap-xs">
          {heightUnit === "imperial" ? (
            <View className="flex-1 flex-row gap-xs">
              <View className="flex-1">
                <Input
                  variant="onboarding"
                  accessibilityLabel="Height in feet"
                  trailingText="ft"
                  numeric="integer"
                  value={ft}
                  onChangeText={setFt}
                />
              </View>
              <View className="flex-1">
                <Input
                  variant="onboarding"
                  accessibilityLabel="Height in inches"
                  trailingText="in"
                  numeric="integer"
                  value={inch}
                  onChangeText={setInch}
                />
              </View>
            </View>
          ) : (
            <View className="flex-1">
              <Input
                variant="onboarding"
                accessibilityLabel="Height in centimetres"
                trailingText="cm"
                numeric="integer"
                value={cm}
                onChangeText={setCm}
              />
            </View>
          )}
          <UnitChips
            options={HEIGHT_UNITS}
            value={heightUnit}
            onChange={switchHeightUnit}
            accessibilityLabel="Height unit"
          />
        </View>
        {/* One line under the whole group, because in feet + inches the height
            is two fields and the problem belongs to neither on its own. */}
        <Text variant="caption" color={heightError() ? "error" : "dark"}>
          {heightError() ?? "How tall are you?"}
        </Text>
      </View>

      {/* The frame sets these two closer together than it sets them from the
          height group, which carries a hint under its field. */}
      <View className="gap-lg">
        <Input
          variant="onboarding"
          label="Age"
          numeric="integer"
          value={age}
          onChangeText={setAge}
          error={ageError()}
        />

        <SelectInput
          variant="onboarding"
          label="Gender"
          value={SEX_OPTIONS.find((option) => option.value === sex)?.label ?? ""}
          onPress={() => setSexSheetOpen(true)}
        />
      </View>

      <SelectSheet<Sex>
        title="Gender"
        options={SEX_OPTIONS}
        value={sex ?? "prefer_not_to_say"}
        visible={sexSheetOpen}
        onChange={setSex}
        onClose={() => setSexSheetOpen(false)}
      />
    </OnboardingStep>
  );
}
