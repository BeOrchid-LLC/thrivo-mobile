import { useState } from "react";
import { router } from "expo-router";
import { Button, Input, Segmented } from "@/components";
import type { UnitSystem } from "@/contracts";
import { kgToLb, lbToKg, roundTo } from "@/utils";
import {
  type OnboardingDraft,
  useOnboardingDraft,
  useOnboardingDraftActions,
  useSessionActions,
} from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { InsightPill } from "@/features/onboarding/components/InsightPill";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

type Unit = "kg" | "lb";

const toDisplay = (kg: number | undefined, unit: Unit): string => {
  if (kg === undefined) return "";
  return String(unit === "kg" ? roundTo(kg) : roundTo(kgToLb(kg)));
};

/** S4 — Figma "Tell us about your weight" (current + target). Storage is always kg. */
export default function WeightStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboarded } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const needsTarget = draft.goal !== "maintain";

  const initialUnit: Unit = draft.unitSystem === "imperial" ? "lb" : "kg";
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [current, setCurrent] = useState(toDisplay(draft.currentWeightKg, initialUnit));
  const [target, setTarget] = useState(toDisplay(draft.targetWeightKg, initialUnit));

  const currentNum = Number.parseFloat(current);
  const targetNum = Number.parseFloat(target);
  const valid = currentNum > 0 && (!needsTarget || targetNum > 0);

  const unitLabel = unit === "kg" ? "kg" : "lbs";

  // Computed gap + ETA at a sustainable rate (Figma insight pill, node 20:212).
  const rate = unit === "kg" ? 1 : 2; // kg or lb per week
  const gap = needsTarget && currentNum > 0 && targetNum > 0 ? Math.abs(currentNum - targetNum) : 0;
  const insight =
    gap > 0
      ? `${roundTo(gap)} ${unit} gap · ~${Math.ceil(gap / rate)} weeks at ${
          targetNum < currentNum ? "–" : "+"
        }${rate} ${unit}/week`
      : null;

  // Re-express the entered numbers when the unit changes so they stay meaningful.
  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const reinterpret = (v: string) => {
      const n = Number.parseFloat(v);
      if (!(n > 0)) return v;
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
      onboardingStep: 3,
    };
  };

  const next = () => {
    if (valid) {
      setFields(buildFields());
    }
    router.push("/(onboarding)/body");
  };

  const skip = () => {
    const fields = buildFields();
    setFields(fields);
    setIsOnboarded(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 3, fields });
  };

  return (
    <OnboardingStep
      step={3}
      title="Let's talk weight"
      subtitle="We'll calculate how far you are from your goal."
      footer={
        <>
          <Button label="Continue" disabled={!valid} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
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
