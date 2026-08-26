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
import { colors, sizing } from "@/theme";
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
import type { OnboardingStepProps } from "../types";

/**
 * Figma-exact metrics for "Onboarding S5" (393pt wide). Literals for the same
 * reason the shell uses them: the scales have no 20, 92, 116 or 168.
 */
const CARD_PADDING = 24;
const READOUT_TO_EDIT = 20;
const EDIT_WIDTH = 168;
const EDIT_ICON = 18;
const HEADING_TO_ROWS = 16;
const ROW_PADDING_Y = 8;
/**
 * The breakdown is two fixed columns with air between them, not a stretched
 * row: the frame wraps every label ("Basal / metabolic rate") and the activity
 * value ("x1.2 / (sedentary)") at these widths.
 */
const ROW_LABEL_WIDTH = 116;
const ROW_VALUE_WIDTH = 92;
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
    onboardingStep: 4 as const,
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
    void submit("skip", { silent: true, onboardingStep: 4, fields });
  };

  return (
    <OnboardingStep
      step={4}
      sectionTitle="Almost done"
      title="Your daily calorie target"
      subtitle="Calculated using Mifflin-St Jeor formula from your height, weight, age, & goal."
      contentToFooter={CONTENT_TO_FOOTER}
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={mode === "revisit" ? "Save and continue" : "This looks right - Continue"}
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
      <TargetReadout
        target={displayedTarget}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((editing) => !editing)}
      />

      {isEditing ? (
        <View className="gap-lg">
          <Input
            variant="onboarding"
            label="Daily calorie target"
            hint="Leave empty to keep the calculated number."
            trailingText="kcal"
            placeholder={preview ? String(preview.dailyTargetKcal) : "2000"}
            numeric="integer"
            value={manualTarget}
            onChangeText={setManualTarget}
            error={manualError}
          />
          <View className="gap-sm">
            <Text variant="body" color="dark" className="font-semibold">
              How active are you?
            </Text>
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
        </View>
      ) : null}

      {preview ? <Breakdown preview={preview} target={displayedTarget} /> : null}
    </OnboardingStep>
  );
}

/** The bordered card: the number, what it is, and the way back to editing it. */
function TargetReadout({
  target,
  isEditing,
  onToggleEdit,
}: {
  target: number | undefined;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  return (
    <View
      style={{ padding: CARD_PADDING }}
      className="items-center rounded-lg border-2 border-targetGreenBorder bg-white"
    >
      <Text variant="hero" color="targetGreen">
        {target !== undefined ? target.toLocaleString() : "—"}
      </Text>
      <Text variant="body" color="targetGreen">
        {target !== undefined ? "Calories per day" : "Complete your body details first"}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isEditing }}
        onPress={onToggleEdit}
        style={{ marginTop: READOUT_TO_EDIT, width: EDIT_WIDTH, height: sizing.controlLg }}
        className="flex-row items-center justify-center gap-md rounded-group border border-gray-200 bg-white active:opacity-[0.85]"
      >
        <PencilIcon size={EDIT_ICON} color={colors.dark} />
        <Text variant="body" color="dark" className="font-semibold">
          {isEditing ? "Done" : "Edit"}
        </Text>
      </Pressable>
    </View>
  );
}

/** "How we calculated this" — the four lines behind the number. */
function Breakdown({ preview, target }: { preview: CalorieBreakdown; target: number | undefined }) {
  const rows = [
    { label: "Basal metabolic rate", value: `${Math.round(preview.bmr).toLocaleString()} kcal` },
    {
      label: "Activity multiplier",
      value: `x${preview.activityFactor} (${preview.activity.replace("_", " ")})`,
    },
    {
      label: "Goal adjustment",
      value: `${preview.goalAdjustmentKcal > 0 ? "+" : ""}${preview.goalAdjustmentKcal.toLocaleString()} kcal`,
    },
    {
      label: "Final daily target",
      value: `${(target ?? preview.dailyTargetKcal).toLocaleString()} kcal`,
    },
  ];

  return (
    <View style={{ padding: CARD_PADDING }} className="rounded-panel bg-white">
      <Text variant="heading3" color="dark">
        How we calculated this
      </Text>

      <View style={{ marginTop: HEADING_TO_ROWS }}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            style={{ paddingVertical: ROW_PADDING_Y }}
            className={`flex-row items-start justify-between ${
              index > 0 ? "border-t border-gray-200" : ""
            }`}
          >
            <Text variant="body" color="subtle" style={{ width: ROW_LABEL_WIDTH }}>
              {row.label}
            </Text>
            <Text
              variant="body"
              color="dark"
              style={{ width: ROW_VALUE_WIDTH }}
              className="text-right"
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
