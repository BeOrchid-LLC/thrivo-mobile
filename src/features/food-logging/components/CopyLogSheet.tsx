import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { BottomSheetShell, Button, RadioGroup, Text, useToast } from "@/components";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { localDay } from "@/utils";
import type { MealTime } from "@/contracts";
import { useCopyFoodLog, useFoodLogDay } from "../hooks/useFoodLogging";
import { buildCopyPlan, groupEntriesByMealTime, totalCalories } from "../utils/copyLog";

export interface CopyLogSheetProps {
  /** The day being copied FROM (`YYYY-MM-DD`); null keeps the sheet closed. */
  day: string | null;
  visible: boolean;
  onClose: () => void;
}

type Selection = "day" | MealTime;

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function formatDayLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Re-logs a past day — all of it, or one meal-time block — onto today.
 *
 * The day is re-fetched here rather than reusing the rows the history list is
 * showing: history can be filtered or searched, and copying "the day" must mean
 * the whole day, not whatever happened to match the current filter.
 */
export function CopyLogSheet({ day: openDay, visible, onClose }: CopyLogSheetProps) {
  // Callers clear the day in the same breath as they hide the sheet, but the
  // sheet has to stay mounted until it has finished animating closed (see
  // `BottomSheetShell`) — so the last day is held for the way down.
  const lastDay = useRef(openDay);
  if (openDay) lastDay.current = openDay;
  const day = openDay ?? lastDay.current;

  const targetDay = useCurrentDay();
  const { showToast } = useToast();
  const { copy, isCopying } = useCopyFoodLog();
  const [selection, setSelection] = useState<Selection>("day");

  const dayQuery = useFoodLogDay(day ?? localDay(), visible && day !== null);
  const entries = useMemo(() => dayQuery.data?.entries ?? [], [dayQuery.data?.entries]);
  const groups = useMemo(() => groupEntriesByMealTime(entries), [entries]);

  useEffect(() => {
    if (visible) setSelection("day");
  }, [visible, day]);

  const selectedEntries =
    selection === "day"
      ? entries
      : (groups.find((group) => group.mealTime === selection)?.entries ?? []);
  const plan = buildCopyPlan(selectedEntries, targetDay);
  const copyCount = plan.payloads.length;

  const options = [
    {
      value: "day" as Selection,
      label: `Whole day · ${plural(entries.length, "item")} · ${totalCalories(entries)} kcal`,
    },
    ...groups.map((group) => ({
      value: group.mealTime as Selection,
      label: `${group.mealTime.charAt(0).toUpperCase() + group.mealTime.slice(1)} · ${plural(
        group.entries.length,
        "item"
      )} · ${group.calories} kcal`,
    })),
  ];

  const runCopy = async () => {
    const result = await copy(selectedEntries, targetDay, selection === "day" ? "day" : "meal");
    if (result.queued > 0) {
      showToast({ message: `Saved offline. ${plural(result.queued, "item")} will sync.` });
      onClose();
      return;
    }
    if (result.copied === 0) {
      showToast({ message: "Could not copy those items. Try again.", variant: "error" });
      return;
    }
    showToast({
      message:
        result.failed > 0
          ? `Copied ${result.copied} of ${result.copied + result.failed} items to today`
          : `${plural(result.copied, "item")} copied to today`,
      variant: result.failed > 0 ? "error" : "success",
    });
    onClose();
  };

  if (!day) return null;

  const isLocked = Boolean(dayQuery.data?.isLocked);

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={`Copy ${formatDayLabel(day)}`}
      closeLabel="Close copy day"
      subtitle={
        <Text variant="caption" color="muted">
          Re-logs the food onto today, at the same times.
        </Text>
      }
    >
      {dayQuery.isLoading ? (
        <Text variant="body" color="muted">
          Loading that day…
        </Text>
      ) : dayQuery.isError ? (
        <Text variant="body" color="error">
          Could not load that day. Close and try again.
        </Text>
      ) : isLocked ? (
        <Text variant="body" color="muted">
          This day is outside your free history window, so there is nothing to copy from.
        </Text>
      ) : entries.length === 0 ? (
        <Text variant="body" color="muted">
          Nothing was logged on this day.
        </Text>
      ) : (
        <View className="gap-md">
          <RadioGroup options={options} value={selection} onChange={setSelection} />
          {plan.skipped > 0 ? (
            <Text variant="caption" color="muted">
              {plural(plan.skipped, "described meal")} can’t be copied — estimates have no saved
              food to re-log. Add those with “Describe it”.
            </Text>
          ) : null}
          <Button
            label={
              copyCount === 0
                ? "Nothing to copy"
                : `Copy ${plural(copyCount, "item")} · ${plan.calories} kcal`
            }
            onPress={() => void runCopy()}
            loading={isCopying}
            disabled={copyCount === 0}
          />
        </View>
      )}
    </BottomSheetShell>
  );
}
