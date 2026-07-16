import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { BellIcon, Button, PageHeader, Screen, Text, TimePicker } from "@/components";
import { useMe, useUpdateProfile } from "@/features/profile";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { colors } from "@/theme";

function timeToDate(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 8, minutes || 0, 0, 0);
  return date;
}

function dateToTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function RemindersScreen() {
  const profile = useMe();
  const settings = useSettings();
  const updateProfile = useUpdateProfile();
  const fallback = settings.data?.dailyFoodLogReminderTime ?? "08:00";
  const [times, setTimes] = useState<string[]>([fallback]);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    if (profile.data?.notifyTimes?.length) {
      setTimes(profile.data.notifyTimes.slice(0, 3).map((value) => value.slice(0, 5)));
    } else if (settings.data?.dailyFoodLogReminderTime) {
      setTimes([settings.data.dailyFoodLogReminderTime.slice(0, 5)]);
    }
  }, [profile.data?.notifyTimes, settings.data?.dailyFoodLogReminderTime]);

  const save = () => {
    updateProfile.mutate(
      { notifyTimes: times, timezone: profile.data?.timezone ?? timezone() },
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
        title="Meal reminders"
        subtitle="Choose when Thrivo should nudge you to log meals"
      />
      <View className="gap-sm">
        {times.map((time, index) => (
          <View
            key={index}
            className="flex-row items-center gap-md rounded-lg border border-gray-200 p-lg"
          >
            <BellIcon size={24} color={colors.primary} />
            <Text className="flex-1">{time}</Text>
            <Button label="Change" variant="ghost" onPress={() => setEditing(index)} />
          </View>
        ))}
      </View>
      {times.length < 3 ? (
        <Button
          label="Add reminder"
          variant="secondary"
          onPress={() => setTimes((current) => [...current, "12:30"])}
        />
      ) : null}
      <Button label="Save changes" loading={updateProfile.isPending} onPress={save} />
      {editing !== null ? (
        <TimePicker
          value={timeToDate(times[editing])}
          onChange={(event, date) => {
            if (event.type === "set" && date) {
              setTimes((current) =>
                current.map((time, index) => (index === editing ? dateToTime(date) : time))
              );
            }
            if (event.type === "set" || event.type === "dismissed") setEditing(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
