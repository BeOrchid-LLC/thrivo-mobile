import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import {
  AthleteIcon,
  Button,
  ChevronDownIcon,
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
import { colors } from "@/theme";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import {
  ACTIVITY_FACTORS,
  DEFAULT_ACTIVITY,
  calorieTarget,
  type CalorieBreakdown,
} from "@/features/onboarding/utils/tdee";
import { TARGET_RANGE_KCAL, parsePositiveInteger } from "@/features/onboarding/utils/validation";
import { STEP_NUMBER } from "../config";
import type { OnboardingStepProps } from "../types";

const STEP = STEP_NUMBER.target;

/**
 * Figma-exact metrics for "Onboarding S5" (393pt wide). Literals for the same
 * reason the shell uses them: the scales have no 20, 92, 116 or 168.
 */
const CARD_PADDING_X = 21.333;
const CARD_PADDING_Y = 25.333;
/** Headline block → the ledger panel. */
const HEADLINE_TO_LEDGER = 20;
const LEDGER_ROW_GAP = 7;
/** This frame sets the actions closer to the content than the earlier steps. */
const CONTENT_TO_FOOTER = 32;

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
  variant,
}: OnboardingStepProps) {
  const { draft } = useOnboardingPrefill();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboardingSkipped } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  // The frame shows a finished number with a multiplier already applied, so the
  // step opens on the default activity rather than asking for one up front.
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    draft.activityLevel ?? DEFAULT_ACTIVITY
  );
  const [manualTarget, setManualTarget] = useState(
    draft.manualDailyTargetKcal ? String(draft.manualDailyTargetKcal) : ""
  );
  const [isEditing, setIsEditing] = useState(Boolean(draft.manualDailyTargetKcal));

  useEffect(() => {
    if (draft.activityLevel) setActivityLevel(draft.activityLevel);
    if (!manualTarget && draft.manualDailyTargetKcal) {
      setManualTarget(String(draft.manualDailyTargetKcal));
      setIsEditing(true);
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
  const manualInRange =
    manualNum !== undefined &&
    manualNum >= TARGET_RANGE_KCAL.min &&
    manualNum <= TARGET_RANGE_KCAL.max;
  const manualValid = manualTarget.trim().length === 0 || manualInRange;
  const manualError = manualValid
    ? undefined
    : manualNum === undefined
      ? "Numbers only"
      : `Enter ${TARGET_RANGE_KCAL.min.toLocaleString()}–${TARGET_RANGE_KCAL.max.toLocaleString()} kcal`;
  const valid = manualValid && (preview !== null || manualInRange);
  const displayedTarget = (manualInRange ? manualNum : undefined) ?? preview?.dailyTargetKcal;

  const buildFields = () => ({
    activityLevel,
    manualDailyTargetKcal: isEditing && manualInRange ? manualNum : null,
    onboardingStep: STEP,
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
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", { silent: true, onboardingStep: STEP, fields });
  };

  return (
    <OnboardingStep
      step={STEP}
      title="Your daily calorie target"
      subtitle="Calculated using Mifflin-St Jeor formula from your height, weight, age, & goal."
      contentToFooter={CONTENT_TO_FOOTER}
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label="Continue"
            disabled={!valid}
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
      <TdeeCard
        preview={preview}
        target={displayedTarget}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((editing) => !editing)}
      />

      {isEditing ? (
        <Input
          variant="onboarding"
          label="Daily calorie target"
          uppercaseLabel
          hint="Leave empty to keep the calculated number."
          trailingText="kcal"
          placeholder={preview ? String(preview.dailyTargetKcal) : "2000"}
          numeric="integer"
          value={manualTarget}
          onChangeText={setManualTarget}
          error={manualError}
          labelAccessory={
            <Button
              label="Done"
              size="compact"
              fullWidth={false}
              disabled={!manualValid}
              onPress={() => setIsEditing(false)}
            />
          }
        />
      ) : null}

      {/* The activity list is not behind the editor in the frame — it is the
          screen's second half, and picking a level recalculates the card above. */}
      <View className="gap-xs">
        <Text variant="body" color="dark" className="font-semibold">
          Want a more accurate target?
        </Text>
        <Text variant="caption" color="subtle" className="font-regular">
          Pick your typical activity level. Recalculates live.
        </Text>
      </View>

      <View className="gap-md">
        {ACTIVITY_OPTIONS.map((option) => (
          <SelectCard
            key={option.value}
            size="compact"
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

const kcal = (n: number): string => `${Math.round(n).toLocaleString("en-US")} kcal`;

/** One ledger line inside the TDEE card. */
function LedgerRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-md">
      <Text variant="caption" color="tdeeLabel" className="font-regular">
        {label}
      </Text>
      <Text
        variant="caption"
        color={strong ? "tdeeNumber" : "tdeeValue"}
        className={strong ? "font-bold" : "font-medium"}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Figma "Onboarding S5" TDEE card: the number, what it is, the formula it came
 * from, the four-line derivation, and the way into editing it by hand — one
 * tinted panel, not the two white cards this screen used to draw.
 */
function TdeeCard({
  preview,
  target,
  isEditing,
  onToggleEdit,
}: {
  preview: CalorieBreakdown | null | undefined;
  target: number | undefined;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  return (
    <View
      style={{ paddingHorizontal: CARD_PADDING_X, paddingVertical: CARD_PADDING_Y }}
      className="overflow-hidden rounded-panel border-[1.333px] border-primaryBright/[0.18] bg-primaryBright/[0.05]"
    >
      <Text variant="heading1" color="tdeeNumber" className="font-bold tracking-tdee">
        {target !== undefined ? target.toLocaleString("en-US") : "—"}
      </Text>
      <Text variant="body" color="primaryDeep">
        {target !== undefined ? "kcal / day" : "Complete your body details first"}
      </Text>

      {preview ? (
        <>
          <View className="mt-sm flex-row items-center gap-xs">
            <Text variant="caption" color="primaryDeep" className="font-regular">
              Based on Mifflin-St Jeor formula
            </Text>
            <ChevronDownIcon size={13} color={colors.primaryDeep} />
          </View>

          <View
            style={{ marginTop: HEADLINE_TO_LEDGER, gap: LEDGER_ROW_GAP }}
            className="rounded-tile bg-primaryBright/[0.07] px-[14px] py-md"
          >
            <LedgerRow label="BMR" value={kcal(preview.bmr)} />
            <LedgerRow
              label={`× Activity (${preview.activity.replace("_", " ")})`}
              value={kcal(preview.maintenanceKcal)}
            />
            <LedgerRow
              label={preview.goalAdjustmentKcal < 0 ? "− Goal deficit" : "+ Goal surplus"}
              value={kcal(preview.goalAdjustmentKcal)}
            />
            <LedgerRow label="Target" value={kcal(target ?? preview.dailyTargetKcal)} strong />
          </View>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isEditing }}
        onPress={onToggleEdit}
        hitSlop={8}
        className="mt-lg flex-row items-center justify-center gap-sm active:opacity-[0.6]"
      >
        <PencilIcon size={20} color={colors.primaryDeep} />
        <Text variant="caption" color="primaryDeep" className="font-semibold">
          {isEditing ? "Done editing" : "Edit target manually"}
        </Text>
      </Pressable>
    </View>
  );
}
