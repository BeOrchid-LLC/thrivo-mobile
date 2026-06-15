import { useState } from "react";
import { router } from "expo-router";
import { Button, Input, Segmented } from "@/components";
import type { UnitSystem } from "@/contracts";
import { kgToLb, lbToKg, roundTo } from "@/utils";
import { useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";

type Unit = "kg" | "lb";

const toDisplay = (kg: number | undefined, unit: Unit): string => {
  if (kg === undefined) return "";
  return String(unit === "kg" ? roundTo(kg) : roundTo(kgToLb(kg)));
};

/** S4 — Figma "Tell us about your weight" (current + target). Storage is always kg. */
export default function WeightStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();

  const initialUnit: Unit = draft.unitSystem === "imperial" ? "lb" : "kg";
  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [current, setCurrent] = useState(toDisplay(draft.currentWeightKg, initialUnit));
  const [target, setTarget] = useState(toDisplay(draft.targetWeightKg, initialUnit));

  const currentNum = Number.parseFloat(current);
  const targetNum = Number.parseFloat(target);
  const valid = currentNum > 0 && targetNum > 0;

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

  const next = () => {
    if (valid) {
      const toKg = (n: number) => (unit === "kg" ? n : lbToKg(n));
      setFields({
        currentWeightKg: roundTo(toKg(currentNum)),
        targetWeightKg: roundTo(toKg(targetNum)),
        unitSystem: (unit === "kg" ? "metric" : "imperial") satisfies UnitSystem,
      });
    }
    router.push("/(onboarding)/body");
  };

  return (
    <OnboardingStep
      step={4}
      title="Tell us about your weight"
      subtitle="We use this to estimate your daily energy needs."
      footer={
        <>
          <Button label="Continue" disabled={!valid} onPress={next} />
          <Button label="Skip for now" variant="ghost" onPress={next} />
        </>
      }
    >
      <Segmented<Unit>
        options={[
          { label: "Kilograms", value: "kg" },
          { label: "Pounds", value: "lb" },
        ]}
        value={unit}
        onChange={switchUnit}
      />
      <Input
        label={`Current weight (${unit})`}
        placeholder={unit === "kg" ? "70" : "154"}
        keyboardType="decimal-pad"
        value={current}
        onChangeText={setCurrent}
      />
      <Input
        label={`Target weight (${unit})`}
        placeholder={unit === "kg" ? "65" : "143"}
        keyboardType="decimal-pad"
        value={target}
        onChangeText={setTarget}
      />
    </OnboardingStep>
  );
}
