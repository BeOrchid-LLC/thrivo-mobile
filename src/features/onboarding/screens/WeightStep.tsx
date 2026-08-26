import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Input } from "@/components";
import type { UnitSystem } from "@/contracts";
import { kgToLb, lbToKg, roundTo } from "@/utils";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { InsightPill } from "@/features/onboarding/components/InsightPill";
import { UnitChips } from "@/features/onboarding/components/UnitChips";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import {
  WEIGHT_RANGE_KG,
  isValidWeightKg,
  parseDecimal,
} from "@/features/onboarding/utils/validation";
import type { OnboardingStepProps } from "../types";

type Unit = "kg" | "lb";

// Both fields carry the chips in the frame, and both drive the one unit.
const UNIT_OPTIONS = [
  { label: "kg", value: "kg" },
  { label: "lbs", value: "lb" },
] as const satisfies readonly { label: string; value: Unit }[];

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
  const unitLabel = unit === "kg" ? "kg" : "lbs";
  const toKgValue = (n: number) => (unit === "kg" ? n : lbToKg(n));
  const isEntered = (value: string) =>
    isValidWeightKg(toKgValue(parseDecimal(value) ?? Number.NaN));
  const currentNum = isEntered(current) ? parseDecimal(current)! : Number.NaN;
  const targetNum = isEntered(target) ? parseDecimal(target)! : Number.NaN;
  const valid = isEntered(current) && (!needsTarget || isEntered(target));

  /**
   * The keypad is only a hint — a hardware keyboard or a paste can leave "qe"
   * or a phone number in the field — so each field says what is wrong with what
   * it is holding rather than silently disabling Continue. Nothing is said
   * until there is something to say: an empty field is not an error yet.
   */
  const weightError = (value: string): string | undefined => {
    if (value.trim().length === 0) return undefined;
    const entered = parseDecimal(value);
    if (entered === undefined) return "Numbers only";
    if (!isValidWeightKg(toKgValue(entered))) {
      const bound = (kg: number) => Math.round(unit === "kg" ? kg : kgToLb(kg));
      return `Enter ${bound(WEIGHT_RANGE_KG.min)}–${bound(WEIGHT_RANGE_KG.max)} ${unitLabel}`;
    }
    return undefined;
  };

  const rate = unit === "kg" ? 1 : 2;
  const gap = needsTarget && currentNum > 0 && targetNum > 0 ? Math.abs(currentNum - targetNum) : 0;
  const insight =
    gap > 0
      ? `${roundTo(gap)} ${unit} gap · ~${Math.ceil(gap / rate)} weeks at ${targetNum < currentNum ? "–" : "+"}${rate} ${unit}/week`
      : null;

  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const reinterpret = (value: string) => {
      const n = parseDecimal(value);
      if (n === undefined || !(n > 0)) return value;
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
      // The frame sets the two field groups further apart than the option cards.
      contentGap={22}
      title="Tell us about your weight"
      subtitle="We listen, we don't judge."
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
      <Input
        variant="onboarding"
        label="Current Weight"
        hint="How much do you weigh at the moment?"
        trailingText={unitLabel}
        trailingAccessory={
          <UnitChips
            options={UNIT_OPTIONS}
            value={unit}
            onChange={switchUnit}
            accessibilityLabel="Weight unit"
          />
        }
        numeric="decimal"
        value={current}
        onChangeText={setCurrent}
        error={weightError(current)}
      />
      {needsTarget ? (
        <Input
          variant="onboarding"
          label="Target Weight"
          hint="What's your ideal weight?"
          trailingText={unitLabel}
          trailingAccessory={
            <UnitChips
              options={UNIT_OPTIONS}
              value={unit}
              onChange={switchUnit}
              accessibilityLabel="Target weight unit"
            />
          }
          numeric="decimal"
          value={target}
          onChangeText={setTarget}
          error={weightError(target)}
        />
      ) : null}
      {insight ? <InsightPill>{insight}</InsightPill> : null}
    </OnboardingStep>
  );
}
