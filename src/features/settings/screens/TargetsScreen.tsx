import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Input, PageHeader, Screen, SelectInput, SelectSheet, Text } from "@/components";
import type { ActivityLevel } from "@/contracts";
import { useMe, useUpdateProfile } from "@/features/profile";
import { ACTIVITY_OPTIONS } from "@/features/onboarding/screens/TargetStep";
import { parsePositiveInteger } from "@/features/onboarding/utils/validation";
import { colors } from "@/theme";

export function TargetsScreen() {
  const profile = useMe();
  const updateProfile = useUpdateProfile();
  const user = profile.data;
  const [activity, setActivity] = useState<ActivityLevel | undefined>();
  const [manualTarget, setManualTarget] = useState("");
  const [editingActivity, setEditingActivity] = useState(false);

  useEffect(() => {
    if (!user) return;
    setActivity(user.activityLevel ?? undefined);
    setManualTarget(user.manualDailyTargetKcal ? String(user.manualDailyTargetKcal) : "");
  }, [user]);

  const selectedActivity = ACTIVITY_OPTIONS.find((option) => option.value === activity);
  const manualValue = parsePositiveInteger(manualTarget);
  const save = () => {
    if (!activity || (manualTarget.trim() && !manualValue)) return;
    updateProfile.mutate(
      {
        activityLevel: activity,
        manualDailyTargetKcal: manualTarget.trim() ? manualValue : null,
      } as never,
      { onSuccess: () => router.back() }
    );
  };

  return (
    <Screen
      scroll
      backgroundColor={colors.white}
      style={{ gap: 20, paddingTop: 32, paddingBottom: 100 }}
    >
      <PageHeader
        title="Targets and activity"
        subtitle="Keep your calorie target grounded in your current routine"
      />
      <SelectInput
        label="Activity level"
        value={selectedActivity?.label ?? "Choose activity level"}
        onPress={() => setEditingActivity(true)}
      />
      <View className="rounded-lg bg-primarySoft p-lg">
        <Text variant="caption" color="muted">
          Current calculated target
        </Text>
        <Text variant="heading1">
          {user?.dailyTargetKcal
            ? `${user.dailyTargetKcal.toLocaleString()} kcal / day`
            : "Complete your profile to calculate a target"}
        </Text>
      </View>
      <Input
        label="Manual calorie target"
        value={manualTarget}
        onChangeText={setManualTarget}
        keyboardType="number-pad"
        trailingText="kcal"
        placeholder="Use calculated target"
        error={
          manualTarget.trim() && !manualValue ? "Enter a whole positive calorie target" : undefined
        }
      />
      <Text variant="caption" color="muted">
        Leave the manual target empty to reset the override and use the calculated target.
      </Text>
      <Button
        label="Save changes"
        loading={updateProfile.isPending}
        disabled={!activity || Boolean(manualTarget.trim() && !manualValue)}
        onPress={save}
      />
      <SelectSheet
        title="Activity level"
        options={ACTIVITY_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={activity ?? ""}
        visible={editingActivity}
        onChange={(value) => setActivity(value as ActivityLevel)}
        onClose={() => setEditingActivity(false)}
      />
    </Screen>
  );
}
