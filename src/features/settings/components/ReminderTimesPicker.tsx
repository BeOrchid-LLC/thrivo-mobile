import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  BellIcon,
  ChevronDownIcon,
  Segmented,
  Text,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { colors } from "@/theme";

/** Slot names, in order. The backend stores times only — these are UI labels. */
const LABELS = ["Morning", "Midday", "Evening"];

/** Seed schedule for a user who has never picked one. */
export const DEFAULT_REMINDER_TIMES = ["08:00", "12:30", "20:00"];

/** How many reminders a day the schedule may hold (`notifyTimes` caps at 3). */
export const MAX_REMINDER_TIMES = 3;

const COUNTS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
];

/** "HH:mm" → "8:00 AM", the way the frames label a slot. */
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

export interface ReminderTimesPickerProps {
  /** Every slot's time as "HH:mm" — up to `MAX_REMINDER_TIMES` of them. */
  times: string[];
  /** How many of `times` are in play (1–3). */
  count: number;
  onCountChange: (count: number) => void;
  onTimeChange: (index: number, time: string) => void;
}

/**
 * The daily food-log reminder schedule: how many nudges a day, and when each
 * one lands. Shared by the onboarding step and the Settings screen so the two
 * surfaces that write `notifyTimes` cannot drift apart — only their page chrome
 * differs (see docs/reminder-scheduling-design.md).
 *
 * State is the caller's: it owns the times because it owns the save.
 */
export function ReminderTimesPicker({
  times,
  count,
  onCountChange,
  onTimeChange,
}: ReminderTimesPickerProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const selectedTimes = times.slice(0, count);

  const onPicked = (event: TimePickerEvent, date?: Date) => {
    if (event.type === "set" && date && editing !== null) {
      onTimeChange(editing, dateToHhmm(date));
    }
    if (event.type === "set" || event.type === "dismissed") setEditing(null);
  };

  return (
    <View className="gap-lg">
      {/* Figma S7: a 72pt tinted header, not a padded strip. */}
      <View className="h-[72px] flex-row items-center gap-lg rounded-group border-[1.333px] border-primaryBright/[0.12] bg-primaryBright/[0.08] px-[17.333px]">
        <BellIcon size={32} color={colors.primaryBright} />
        <Text variant="caption" color="subtle" className="uppercase tracking-label">
          Reminders per day
        </Text>
      </View>

      <Segmented
        fullWidth
        equalSegments
        size="count"
        options={COUNTS}
        value={String(count)}
        activeColor="primaryBright"
        onChange={(value) => onCountChange(Number(value))}
      />

      <View className="gap-sm">
        {selectedTimes.map((time, index) => {
          const accent = index === 0;
          return (
            <View
              key={index}
              // The frame keeps every row white; only the outline, the badge and
              // the time chip say which one is the next reminder.
              className={`h-[60px] flex-row items-center rounded-group border-[1.333px] bg-white px-lg ${
                accent ? "border-primaryBright" : "border-hairline"
              }`}
            >
              <View
                className={`h-[28px] w-[28px] items-center justify-center rounded-pill ${accent ? "bg-primaryBright" : "bg-numberBadge"}`}
              >
                <Text variant="caption" color={accent ? "inverse" : "subtle"} className="font-bold">
                  {index + 1}
                </Text>
              </View>
              <Text variant="body-sm" color="dark" className="ml-md flex-1 font-medium">
                {LABELS[index]}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${LABELS[index]} reminder time`}
                onPress={() => setEditing(index)}
                className={`flex-row items-center gap-xs rounded-md border-[0.667px] px-md py-sm ${
                  accent
                    ? "border-primaryBright/[0.12] bg-primaryBright/[0.08]"
                    : "border-segmentTrack bg-light"
                }`}
              >
                <Text
                  variant="body-sm"
                  color={accent ? "primaryBright" : "dark"}
                  className="font-semibold"
                >
                  {to12h(time)}
                </Text>
                <ChevronDownIcon size={13} color={accent ? colors.primary : colors.gray[500]} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {editing !== null ? (
        <TimePicker value={hhmmToDate(times[editing])} onChange={onPicked} />
      ) : null}
    </View>
  );
}
