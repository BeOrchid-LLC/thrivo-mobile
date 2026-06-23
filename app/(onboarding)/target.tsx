import { useMemo, useState } from "react";
import type { ComponentType } from "react";
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
import {
  type OnboardingDraft,
  useOnboardingDraft,
  useOnboardingDraftActions,
  useSessionActions,
} from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { ACTIVITY_FACTORS, calorieTarget } from "@/features/onboarding/utils/tdee";

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

const DEFAULTS = {
  goal: "maintain" as const,
  sex: "prefer_not_to_say" as const,
  heightCm: 170,
  ageYears: 30,
  currentWeightKg: 70,
};

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export default function TargetStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboarded } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    draft.activityLevel ?? "sedentary"
  );
  const [manualTarget, setManualTarget] = useState(
    draft.manualDailyTargetKcal ? String(draft.manualDailyTargetKcal) : ""
  );
  const [showManual, setShowManual] = useState(Boolean(draft.manualDailyTargetKcal));

  const preview = useMemo(
    () =>
      calorieTarget({
        goal: draft.goal ?? DEFAULTS.goal,
        sex: draft.sex ?? DEFAULTS.sex,
        heightCm: draft.heightCm ?? DEFAULTS.heightCm,
        ageYears: draft.ageYears ?? DEFAULTS.ageYears,
        weightKg: draft.currentWeightKg ?? DEFAULTS.currentWeightKg,
        activity: activityLevel,
      }),
    [activityLevel, draft.ageYears, draft.currentWeightKg, draft.goal, draft.heightCm, draft.sex]
  );

  const manualNum = Number.parseInt(manualTarget, 10);
  const hasManualTarget = manualTarget.trim().length > 0;
  const manualValid = !hasManualTarget || manualNum > 0;
  const displayedTarget = hasManualTarget && manualNum > 0 ? manualNum : preview.dailyTargetKcal;

  const buildFields = (): Partial<OnboardingDraft> => ({
    activityLevel,
    manualDailyTargetKcal: hasManualTarget && manualNum > 0 ? manualNum : undefined,
    onboardingStep: 5,
  });

  const next = () => {
    if (!manualValid) return;
    setFields(buildFields());
    router.push("/(onboarding)/start-free");
  };

  const skip = () => {
    const fields = buildFields();
    setFields(fields);
    setIsOnboarded(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 5, fields });
  };

  return (
    <OnboardingStep
      step={5}
      title="Your daily calorie target"
      footer={
        <>
          <Button label="Continue" disabled={!manualValid} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
        </>
      }
    >
      <View className="overflow-hidden rounded-[16px] bg-primarySoft p-lg">
        {/* Decorative ring echoing the Figma card flourish. */}
        <View className="absolute -right-8 -top-8 h-[130px] w-[130px] rounded-pill border-[18px] border-primaryBright/[0.1]" />

        <Text className="font-bold text-[40px] leading-[48px] text-primary">
          {displayedTarget.toLocaleString()}
        </Text>
        <Text variant="body" color="muted">
          kcal / day
        </Text>
        <Text variant="caption" color="muted" className="mt-sm font-regular">
          Based on Mifflin-St Jeor formula
        </Text>

        <View className="mt-md gap-xs">
          <BreakRow label="BMR" value={`${preview.bmr.toLocaleString()} kcal`} />
          <BreakRow
            label={`× Activity (${preview.activity.replace("_", " ")})`}
            value={`${preview.maintenanceKcal.toLocaleString()} kcal`}
          />
          <BreakRow
            label={preview.goalAdjustmentKcal < 0 ? "− Goal deficit" : "+ Goal surplus"}
            value={`${signed(preview.goalAdjustmentKcal)} kcal`}
          />
          <View className="my-xs h-[0.667px] bg-primaryBright/[0.2]" />
          <BreakRow
            label="Target"
            value={`${preview.dailyTargetKcal.toLocaleString()} kcal`}
            strong
          />
        </View>

        <Pressable
          onPress={() => setShowManual((s) => !s)}
          accessibilityRole="button"
          className="mt-md flex-row items-center justify-center gap-xs"
        >
          <PencilIcon size={16} />
          <Text variant="caption" color="primary" className="font-semibold">
            Edit target manually
          </Text>
        </Pressable>

        {showManual ? (
          <View className="mt-sm">
            <Input
              label="Manual calorie target"
              uppercaseLabel
              trailingText="kcal"
              placeholder={String(preview.dailyTargetKcal)}
              keyboardType="number-pad"
              value={manualTarget}
              onChangeText={setManualTarget}
              error={manualValid ? undefined : "Enter a positive calorie target"}
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
