import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Input, Segmented } from "@/components";
import type { UnitSystem } from "@/contracts";
import { kgToLb, lbToKg, roundTo } from "@/utils";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { InsightPill } from "@/features/onboarding/components/InsightPill";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { isValidWeightKg } from "@/features/onboarding/utils/validation";
import type { OnboardingStepProps } from "../types";

type Unit = "kg" | "lb";

const toDisplay = (kg: number | undefined, unit: Unit): string => {
  if (kg === undefined) return "";
  return String(unit === "kg" ? roundTo(kg) : roundTo(kgToLb(kg)));
};

export default function WeightStep({
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
  const initialUnit: Unit = (draft.unitSystem ?? settings?.unitSystem) === "imperial" ? "lb" : "kg";
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [current, setCurrent] = useState(toDisplay(draft.currentWeightKg, initialUnit));
  const [target, setTarget] = useState(toDisplay(draft.targetWeightKg, initialUnit));

  useEffect(() => {
    if (draft.currentWeightKg !== undefined && !current) {
      setCurrent(toDisplay(draft.currentWeightKg, unit));
    }
    if (draft.targetWeightKg !== undefined && !target) {
      setTarget(toDisplay(draft.targetWeightKg, unit));
    }
  }, [current, draft.currentWeightKg, draft.targetWeightKg, target, unit]);

  const needsTarget = draft.goal !== "maintain";
  const currentNum = Number.parseFloat(current);
  const targetNum = Number.parseFloat(target);
  const toKgValue = (n: number) => (unit === "kg" ? n : lbToKg(n));
  const valid =
    isValidWeightKg(toKgValue(currentNum)) &&
    (!needsTarget || isValidWeightKg(toKgValue(targetNum)));
  const unitLabel = unit === "kg" ? "kg" : "lbs";
  const rate = unit === "kg" ? 1 : 2;
  const gap = needsTarget && currentNum > 0 && targetNum > 0 ? Math.abs(currentNum - targetNum) : 0;
  const insight =
    gap > 0
      ? `${roundTo(gap)} ${unit} gap · ~${Math.ceil(gap / rate)} weeks at ${targetNum < currentNum ? "–" : "+"}${rate} ${unit}/week`
      : null;

  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const reinterpret = (value: string) => {
      const n = Number.parseFloat(value);
      if (!(n > 0)) return value;
      const kg = unit === "kg" ? n : lbToKg(n);
      return String(roundTo(next === "kg" ? kg : kgToLb(kg)));
    };
    setCurrent(reinterpret(current));
    setTarget(reinterpret(target));
    setUnit(next);
  };

  const buildFields = (): Partial<OnboardingDraft> => {
    const toKg = (n: number) => (unit === "kg" ? n : lbToKg(n));
    return {
      currentWeightKg: currentNum > 0 ? roundTo(toKg(currentNum)) : undefined,
      targetWeightKg: needsTarget && targetNum > 0 ? roundTo(toKg(targetNum)) : undefined,
      unitSystem: (unit === "kg" ? "metric" : "imperial") satisfies UnitSystem,
      onboardingStep: 2,
    };
  };

  const next = () => {
    if (!valid) return;
    const fields = buildFields();
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    router.push("/(onboarding)/body");
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
    void submit("skip", { silent: true, onboardingStep: 2, fields });
  };

  return (
    <OnboardingStep
      step={2}
      title="Let's talk weight"
      subtitle="We'll calculate how far you are from your goal."
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
      <Segmented<Unit>
        options={[
          { label: "lbs", value: "lb" },
          { label: "kg", value: "kg" },
        ]}
        value={unit}
        onChange={switchUnit}
      />
      <Input
        label="Current weight"
        uppercaseLabel
        trailingText={unitLabel}
        placeholder={unit === "kg" ? "70" : "154"}
        keyboardType="decimal-pad"
        value={current}
        onChangeText={setCurrent}
      />
      {needsTarget ? (
        <Input
          label="Target weight"
          uppercaseLabel
          trailingText={unitLabel}
          placeholder={unit === "kg" ? "65" : "143"}
          keyboardType="decimal-pad"
          value={target}
          onChangeText={setTarget}
        />
      ) : null}
      {insight ? <InsightPill>{insight}</InsightPill> : null}
    </OnboardingStep>
  );
}
