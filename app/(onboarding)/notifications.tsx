import { useState } from "react";
import { router } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { BellIcon, Button, ChevronDownIcon, Segmented, Text } from "@/components";
import { colors } from "@/theme";
import { registerForPushNotifications } from "@/lib";
import { type OnboardingDraft, useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

const LABELS = ["Morning", "Midday", "Evening"];
const DEFAULT_TIMES = ["08:00", "12:30", "20:00"];
const COUNTS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
];

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function NotificationsStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();

  const initialTimes = [...DEFAULT_TIMES];
  (draft.notifyTimes ?? []).forEach((t, i) => {
    if (i < 3) initialTimes[i] = t.slice(0, 5);
  });
  const [times, setTimes] = useState(initialTimes);
  const [count, setCount] = useState(Math.min(Math.max(draft.notifyTimes?.length ?? 2, 1), 3));
  const [editing, setEditing] = useState<number | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const busy = isPending || isRegistering;
  const selectedTimes = times.slice(0, count);

  const fieldsToSave = (): Partial<OnboardingDraft> => ({
    notifyTimes: selectedTimes,
    timezone: localTimezone(),
    onboardingStep: 7,
  });

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setEditing(null);
    if (date && (Platform.OS === "ios" || event.type === "set")) {
      const value = dateToHhmm(date);
      setTimes((prev) => prev.map((t, idx) => (idx === editing ? value : t)));
    }
  };

  const finish = async () => {
    const next = fieldsToSave();
    setFields(next);
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await registerForPushNotifications(next.notifyTimes);
    } catch {
      setRegisterError("Couldn't enable notifications. You can turn them on later in Settings.");
    } finally {
      setIsRegistering(false);
    }
    await submit("skip", { silent: true, onboardingStep: 7, fields: next });
    router.replace("/(app)/dashboard");
  };

  const skip = async () => {
    const next = fieldsToSave();
    setFields(next);
    await submit("skip", { silent: true, onboardingStep: 7, fields: next });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={7}
      title="Your daily nudges"
      subtitle="Pick 1–3 reminder times a day. We'll check in — not spam you."
      footer={
        <>
          <Button label="Enable notifications" loading={busy} onPress={finish} />
          <Button label="Skip for now" variant="ghost" disabled={busy} onPress={skip} />
          {registerError ? (
            <Text variant="caption" color="error" className="text-center font-regular">
              {registerError}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="flex-row items-center gap-md rounded-[14px] bg-primarySoft px-lg py-md">
        <BellIcon size={28} color={colors.primary} />
        <Text variant="caption" color="muted" className="uppercase tracking-[0.78px]">
          Reminders per day
        </Text>
      </View>

      <Segmented options={COUNTS} value={String(count)} onChange={(v) => setCount(Number(v))} />

      <View className="gap-sm">
        {selectedTimes.map((time, i) => {
          const accent = i === 0;
          return (
            <View
              key={i}
              className={`flex-row items-center rounded-[14px] border-[1.333px] px-lg py-md ${
                accent ? "border-primaryBright bg-primaryBright/[0.06]" : "border-gray-300 bg-white"
              }`}
            >
              <View
                className={`h-[28px] w-[28px] items-center justify-center rounded-pill ${
                  accent ? "bg-primaryBright" : "bg-gray-200"
                }`}
              >
                <Text
                  variant="caption"
                  className={accent ? "text-white" : "text-gray-500"}
                >{`${i + 1}`}</Text>
              </View>
              <Text variant="body" color="dark" className="ml-md flex-1 font-medium">
                {LABELS[i]}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${LABELS[i]} reminder time`}
                onPress={() => setEditing(i)}
                className={`flex-row items-center gap-xs rounded-md px-md py-sm ${
                  accent ? "bg-primaryBright/[0.12]" : "bg-gray-100"
                }`}
              >
                <Text variant="caption" className={accent ? "text-primary" : "text-dark"}>
                  {to12h(time)}
                </Text>
                <ChevronDownIcon size={13} color={accent ? colors.primary : colors.gray[500]} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {editing !== null ? (
        <View className="items-center">
          <DateTimePicker
            value={hhmmToDate(times[editing])}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
          />
          {Platform.OS === "ios" ? (
            <Button label="Done" variant="ghost" onPress={() => setEditing(null)} />
          ) : null}
        </View>
      ) : null}
    </OnboardingStep>
  );
}
