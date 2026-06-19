import { useMemo, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Card, Input, Text } from "@/components";
import type { ActivityLevel } from "@/contracts";
import { colors, spacing } from "@/theme";
import { type OnboardingDraft, useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { SelectCard } from "@/features/onboarding/components/SelectCard";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { calorieTarget } from "@/features/onboarding/utils/tdee";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary", label: "Desk most days", description: "Little planned movement" },
  { value: "light", label: "Lightly active", description: "Walks or light workouts" },
  { value: "moderate", label: "Moderately active", description: "Training 3-5 days weekly" },
  { value: "active", label: "Very active", description: "Hard training or active job" },
  { value: "very_active", label: "Athlete level", description: "Intense daily training" },
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
  const { submit, isPending } = useSubmitOnboarding();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    draft.activityLevel ?? "sedentary"
  );
  const [manualTarget, setManualTarget] = useState(
    draft.manualDailyTargetKcal ? String(draft.manualDailyTargetKcal) : ""
  );

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

  const skip = async () => {
    const fields = buildFields();
    setFields(fields);
    await submit("skip", { silent: true, onboardingStep: 5, fields });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={5}
      title="Your daily target"
      subtitle="Pick the activity level that feels closest. You can edit the calories manually too."
      footer={
        <>
          <Button label="This looks right — continue" disabled={!manualValid} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
        </>
      }
    >
      <Card style={styles.hero}>
        <Text variant="heading1" color="primary">
          {displayedTarget.toLocaleString()}
        </Text>
        <Text variant="body" color="muted">
          calories per day
        </Text>
      </Card>

      <View style={styles.activityList}>
        {ACTIVITY_OPTIONS.map((option) => (
          <SelectCard
            key={option.value}
            label={option.label}
            description={option.description}
            selected={activityLevel === option.value}
            onPress={() => setActivityLevel(option.value)}
          />
        ))}
      </View>

      <Input
        label="Manual calorie target"
        placeholder={String(preview.dailyTargetKcal)}
        keyboardType="number-pad"
        value={manualTarget}
        onChangeText={setManualTarget}
        error={manualValid ? undefined : "Enter a positive calorie target"}
      />

      <Card>
        <Text variant="heading3" color="dark" style={styles.cardTitle}>
          Estimate details
        </Text>
        <Row label="BMR" value={`${preview.bmr.toLocaleString()} kcal`} />
        <Row
          label={`Activity x${preview.activityFactor}`}
          value={`${preview.maintenanceKcal.toLocaleString()} kcal`}
        />
        <Row label="Goal adjustment" value={`${signed(preview.goalAdjustmentKcal)} kcal`} />
        <View style={styles.divider} />
        <Row
          label="Recommended target"
          value={`${preview.dailyTargetKcal.toLocaleString()} kcal`}
        />
      </Card>
    </OnboardingStep>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text variant="caption" color="dark">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.xs },
  activityList: { gap: spacing.sm },
  cardTitle: { marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  divider: { height: 1, backgroundColor: colors.gray[200], marginVertical: spacing.xs },
});
