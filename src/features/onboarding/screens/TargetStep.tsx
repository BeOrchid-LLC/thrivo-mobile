import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import {
  AthleteIcon,
  Button,
  Input,
  IntenseIcon,
  PencilIcon,
  RunIcon,
  SeatedIcon,
  Text,
  WalkIcon,
  type IconProps,
} from "@/components";
import type { ActivityLevel } from "@/contracts";
import type { ComponentType } from "react";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { ACTIVITY_FACTORS, calorieTarget } from "@/features/onboarding/utils/tdee";
import { parsePositiveInteger } from "@/features/onboarding/utils/validation";
import type { OnboardingStepProps } from "../types";

const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
}[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Desk job or mostly seated",
    icon: SeatedIcon,
  },
  {
    value: "light",
    label: "Lightly active",
    description: "Walking, light gym 1-3×/wk",
    icon: WalkIcon,
  },
  {
    value: "moderate",
    label: "Moderately active",
    description: "Cardio or weights 3-5×/wk",
    icon: RunIcon,
  },
  {
    value: "active",
    label: "Very active",
    description: "Intense training 6-7×/wk",
    icon: IntenseIcon,
  },
  {
    value: "very_active",
    label: "Super active",
    description: "Athlete or hard physical job",
    icon: AthleteIcon,
  },
];

export { ACTIVITY_OPTIONS };

export default function TargetStep({
  mode = "initial",
  onNext,
  onDone,
  onBack,
  isSaving,
}: OnboardingStepProps) {
  const { draft } = useOnboardingPrefill();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboardingSkipped } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>(
    draft.activityLevel
  );
  const [manualTarget, setManualTarget] = useState(
    draft.manualDailyTargetKcal ? String(draft.manualDailyTargetKcal) : ""
  );
  const [showManual, setShowManual] = useState(Boolean(draft.manualDailyTargetKcal));

  useEffect(() => {
    if (draft.activityLevel) setActivityLevel(draft.activityLevel);
    if (!manualTarget && draft.manualDailyTargetKcal) {
      setManualTarget(String(draft.manualDailyTargetKcal));
      setShowManual(true);
    }
  }, [draft.activityLevel, draft.manualDailyTargetKcal, manualTarget]);

  const previewReady =
    draft.goal !== undefined &&
    draft.sex !== undefined &&
    draft.heightCm !== undefined &&
    draft.ageYears !== undefined &&
    draft.currentWeightKg !== undefined;

  const preview = useMemo(
    () =>
      previewReady
        ? calorieTarget({
            goal: draft.goal!,
            sex: draft.sex!,
            heightCm: draft.heightCm!,
            ageYears: draft.ageYears!,
            weightKg: draft.currentWeightKg!,
            activity: activityLevel,
          })
        : null,
    [
      activityLevel,
      draft.ageYears,
      draft.currentWeightKg,
      draft.goal,
      draft.heightCm,
      draft.sex,
      previewReady,
    ]
  );

  const manualNum = parsePositiveInteger(manualTarget);
  const manualValid = manualTarget.trim().length === 0 || manualNum !== undefined;
  const valid =
    Boolean(activityLevel) && manualValid && (preview !== null || manualNum !== undefined);
  const displayedTarget = manualNum ?? preview?.dailyTargetKcal;

  const buildFields = () => ({
    activityLevel,
    manualDailyTargetKcal: showManual ? manualNum : null,
    onboardingStep: 5 as const,
  });

  const next = () => {
    if (!valid) return;
    const fields = buildFields();
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    router.push("/(onboarding)/start-free");
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
    void submit("skip", { silent: true, onboardingStep: 5, fields });
  };

  return (
    <OnboardingStep
      step={5}
      title="Your daily calorie target"
      onBack={mode === "revisit" ? onBack : undefined}
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
      <View className="overflow-hidden rounded-[16px] bg-primarySoft p-lg">
        <Text className="font-bold text-[40px] leading-[48px] text-primary">
          {displayedTarget !== undefined ? displayedTarget.toLocaleString() : "—"}
        </Text>
        <Text variant="body" color="muted">
          {displayedTarget !== undefined ? "kcal / day" : "Complete your body details first"}
        </Text>
        {preview ? (
          <View className="mt-md gap-xs">
            <BreakRow label="BMR" value={`${preview.bmr.toLocaleString()} kcal`} />
            <BreakRow
              label={`× Activity (${preview.activity.replace("_", " ")})`}
              value={`${preview.maintenanceKcal.toLocaleString()} kcal`}
            />
            <BreakRow
              label={preview.goalAdjustmentKcal < 0 ? "− Goal deficit" : "+ Goal surplus"}
              value={`${preview.goalAdjustmentKcal >= 0 ? "+" : ""}${preview.goalAdjustmentKcal} kcal`}
            />
            <BreakRow
              label="Target"
              value={`${preview.dailyTargetKcal.toLocaleString()} kcal`}
              strong
            />
          </View>
        ) : null}
        <Pressable
          onPress={() => setShowManual((value) => !value)}
          accessibilityRole="button"
          className="mt-md flex-row items-center justify-center gap-xs"
        >
          <PencilIcon size={16} />
          <Text variant="caption" color="primary" className="font-semibold">
            {showManual ? "Use calculated target" : "Edit target manually"}
          </Text>
        </Pressable>
        {showManual ? (
          <View className="mt-sm">
            <Input
              label="Manual calorie target"
              uppercaseLabel
              trailingText="kcal"
              placeholder={preview ? String(preview.dailyTargetKcal) : "2000"}
              keyboardType="number-pad"
              value={manualTarget}
              onChangeText={setManualTarget}
              error={manualValid ? undefined : "Enter a whole positive calorie target"}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-xs">
        <Text variant="body" color="dark" className="font-semibold">
          Want a more accurate target?
        </Text>
        <Text variant="caption" color="muted" className="font-regular">
          Pick your typical activity level. Recalculates live.
        </Text>
      </View>

      <View className="gap-sm">
        {ACTIVITY_OPTIONS.map((option) => (
          <SelectCard
            key={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            trailingText={`×${ACTIVITY_FACTORS[option.value]}`}
            selected={activityLevel === option.value}
            onPress={() => setActivityLevel(option.value)}
          />
        ))}
      </View>
    </OnboardingStep>
  );
}

function BreakRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="caption" className={`font-regular ${strong ? "text-dark" : "text-gray-500"}`}>
        {label}
      </Text>
      <Text variant="caption" className={strong ? "font-semibold text-dark" : "text-gray-500"}>
        {value}
      </Text>
    </View>
  );
}
