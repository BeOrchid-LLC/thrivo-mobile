import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import {
  BellIcon,
  Button,
  ChevronDownIcon,
  Segmented,
  Text,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { colors } from "@/theme";
import { localTimezone } from "@/utils";
import { analytics, registerForPushNotifications } from "@/lib";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { ONBOARDING_COMPLETE_STEP } from "../config";
import type { OnboardingStepProps } from "../types";

const LABELS = ["Morning", "Midday", "Evening"];
const DEFAULT_TIMES = ["08:00", "12:30", "20:00"];
const COUNTS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
];

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

function dateToHhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function NotificationsStep({
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
  const seededTimes = draft.notifyTimes?.length ? draft.notifyTimes : DEFAULT_TIMES;
  const [times, setTimes] = useState(seededTimes);
  const [count, setCount] = useState(Math.min(Math.max(draft.notifyTimes?.length ?? 2, 1), 3));
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedTimes = times.slice(0, count);

  useEffect(() => {
    if (!draft.notifyTimes?.length) return;
    setTimes(draft.notifyTimes);
    setCount(Math.min(Math.max(draft.notifyTimes.length, 1), 3));
  }, [draft.notifyTimes]);

  const fieldsToSave = (): Partial<OnboardingDraft> => ({
    notifyTimes: selectedTimes,
    timezone: draft.timezone ?? localTimezone(),
    onboardingStep: 6,
  });

  const onTimeChange = (event: TimePickerEvent, date?: Date) => {
    if (event.type === "set" && date) {
      const value = dateToHhmm(date);
      setTimes((previous) => previous.map((time, index) => (index === editing ? value : time)));
    }
    if (event.type === "set" || event.type === "dismissed") setEditing(null);
  };

  /**
   * Only a *saved* schedule counts — not a picker that was opened, and not a
   * save that failed.
   *
   * This screen is where most users first set their reminder times, and it
   * emitted nothing: the funnel only ever saw the Settings pickers, which write
   * a different field entirely (see docs/reminder-scheduling-design.md). The
   * `reminder` property separates the two surfaces, which is also the cheapest
   * way to find out which one users actually reach for.
   */
  const trackReminderSet = (times: string[] | undefined) => {
    analytics.track("thrivo.reminder_set", {
      reminder: "notifyTimes",
      count: times?.length ?? 0,
    });
  };

  const finish = async () => {
    setError(null);
    const next = fieldsToSave();
    setFields(next);
    try {
      if (mode === "revisit") {
        await onNext?.(next);
      } else {
        await submit("complete", { onboardingStep: ONBOARDING_COMPLETE_STEP, fields: next });
      }
      trackReminderSet(next.notifyTimes);
    } catch {
      setError("We couldn't save your reminder preferences. Please try again.");
      return;
    }
    try {
      // Persist the local schedule before associating the device token with it.
      // Permission denial is a supported offline/in-app fallback; registration
      // failures surface so the user can retry the backend operation.
      await registerForPushNotifications(next.notifyTimes);
    } catch {
      setError(
        "Your reminder times were saved, but push notifications couldn't be enabled. Please try again."
      );
      return;
    }
    // The Settings revisit host owns its own navigation — only the onboarding
    // run hands off to the dashboard.
    if (mode === "revisit") return;
    router.replace("/(app)/(tabs)/dashboard");
  };

  const skip = () => {
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: 6,
      fields: { notifyTimes: undefined, timezone: undefined },
    });
  };

  return (
    <OnboardingStep
      step={6}
      title="Food log reminders"
      subtitle="Pick 1–3 local times a day to remember your food log."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={mode === "revisit" ? "Save and finish" : "Enable notifications"}
            loading={isPending || isSaving}
            onPress={() => void finish()}
          />
          <Button
            label={mode === "revisit" ? "Done later" : "Skip for now"}
            variant="ghost"
            disabled={isPending || isSaving}
            onPress={skip}
          />
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="flex-row items-center gap-md rounded-group bg-primarySoft px-lg py-md">
        <BellIcon size={28} color={colors.primary} />
        <Text variant="caption" color="muted" className="uppercase tracking-label">
          Reminders per day
        </Text>
      </View>

      <Segmented
        options={COUNTS}
        value={String(count)}
        onChange={(value) => setCount(Number(value))}
      />

      <View className="gap-sm">
        {selectedTimes.map((time, index) => {
          const accent = index === 0;
          return (
            <View
              key={index}
              className={`flex-row items-center rounded-group border-[1.333px] px-lg py-md ${accent ? "border-primaryBright bg-primaryBright/[0.06]" : "border-gray-300 bg-white"}`}
            >
              <View
                className={`h-[28px] w-[28px] items-center justify-center rounded-pill ${accent ? "bg-primaryBright" : "bg-gray-200"}`}
              >
                <Text variant="caption" color={accent ? "inverse" : "gray500"}>
                  {index + 1}
                </Text>
              </View>
              <Text variant="body" color="dark" className="ml-md flex-1 font-medium">
                {LABELS[index]}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${LABELS[index]} reminder time`}
                onPress={() => setEditing(index)}
                className={`min-h-touchTarget flex-row items-center gap-xs rounded-md px-md py-sm ${accent ? "bg-primaryBright/[0.12]" : "bg-gray-100"}`}
              >
                <Text variant="caption" color={accent ? "primary" : "dark"}>
                  {to12h(time)}
                </Text>
                <ChevronDownIcon size={13} color={accent ? colors.primary : colors.gray[500]} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {editing !== null ? (
        <TimePicker value={hhmmToDate(times[editing])} onChange={onTimeChange} />
      ) : null}
    </OnboardingStep>
  );
}
