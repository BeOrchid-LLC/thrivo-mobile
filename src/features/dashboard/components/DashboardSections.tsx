import { useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AnimatedNumber,
  Card,
  CalorieRing,
  PremiumGate,
  SectionError,
  SkeletonBlock,
  SkeletonText,
  Text,
} from "@/components";
import type { FoodLogEntry, Mood } from "@/contracts";
// Deep import, not the `@/features/checkin` barrel — that barrel re-exports
// `CheckinScreen`, which imports back from `@/features/dashboard`, so the barrel
// route is a require cycle that leaves this module's own exports undefined.
import { useCheckins, useCreateCheckin } from "@/features/checkin/hooks/useCheckin";
import { EditFoodLogSheet } from "@/features/food-logging";
import { deriveMacroTargets } from "@/features/onboarding/utils/tdee";
import { colors, spacing } from "@/theme";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { formatNumber } from "@/utils";
import { MacroBars } from "./MacroBars";
import { MoodCheckinRow, MoodCheckinSummary } from "./MoodCheckinRow";
import { MealLog } from "./MealLog";
import { StreakBanner } from "./StreakBanner";
import { WaterTracker } from "./WaterTracker";
import {
  useAddWater,
  useDashboardCalories,
  useDashboardMacros,
  useDashboardMealLog,
  useDashboardStreak,
  useDashboardWater,
} from "../hooks/useDashboard";

const GLASS_ML = 250;
const DEFAULT_TARGET_CALORIES = 1800;
const ZERO_MACROS = { proteinG: 0, carbsG: 0, fatG: 0 };

const goToLog = () => router.push("/(app)/(tabs)/log");
const goToWaterLog = () => router.push("/(app)/(tabs)/log?segment=water");
const goToHistory = () => router.push("/(app)/history");
const goToCheckin = () => router.push("/(app)/checkin");
const goToProgress = () => router.push("/(app)/(tabs)/metrics");
const goToProgressCalendar = () => router.push("/(app)/(tabs)/metrics?section=calendar");

const styles = StyleSheet.create({
  /**
   * Figma 371:337: a 2px `light` border with 12/20 padding. These are inline
   * because `Card` sets `borderWidth: hairlineWidth` and `p-lg` itself — an
   * inline style is the only thing that reliably beats both, and a `border-2`
   * className was silently losing to the hairline.
   */
  macroCard: {
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
  },
  macroCardShadow: {
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
});

export function MoodCheckinSection() {
  const day = useCurrentDay();
  const checkins = useCheckins();
  const create = useCreateCheckin();

  // All three sources are filtered by `day` for the same reason the check-in
  // screen does it: `useCurrentDay` rolls over at midnight, and the mutation
  // result still holds yesterday's check-in until it is refetched.
  const submitted = create.data?.checkin;
  // The tapped mood, shown from the tap rather than from the response. A
  // round-trip is long enough that waiting for it leaves the row sitting there
  // looking like the tap missed. It is dropped again if the write fails, which
  // is the only case where the row has anything left to say.
  const optimistic = create.variables?.day === day ? create.variables.mood : null;
  const todaysMood =
    optimistic ??
    (submitted?.day === day ? submitted.mood : null) ??
    (checkins.data ?? []).find((checkin) => checkin.day === day)?.mood ??
    null;

  // One check-in per day: once a face is tapped the row collapses and stays
  // collapsed, including while the write is still in flight or has failed. The
  // failure is reported under the summary rather than by re-asking the question
  // — re-asking is what turned a slow write into repeated taps and a 429.
  if (todaysMood) {
    return (
      <View className="gap-xs">
        <MoodCheckinSummary mood={todaysMood} onPress={goToCheckin} />
        {create.isError ? (
          <Text variant="micro" color="error">
            {create.error?.message ?? "Could not save that"} — open check-in to retry.
          </Text>
        ) : null}
      </View>
    );
  }

  if (checkins.isLoading) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading today's check-in">
        <SkeletonText className="w-1/2" />
      </View>
    );
  }

  // A failed history fetch is not a reason to hide the prompt — the worst case
  // is offering a check-in that is already recorded, which the screen reconciles.
  return (
    <View className="gap-xs">
      <MoodCheckinRow
        onSelect={(mood: Mood) => create.mutate({ mood, day })}
        disabled={create.isPending}
      />
      {create.isError ? (
        <Text variant="micro" color="error">
          {create.error?.message ?? "Could not save that"} — tap a face to try again.
        </Text>
      ) : null}
    </View>
  );
}

export function CaloriesSummarySection() {
  const calories = useDashboardCalories();

  if (calories.isLoading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading calorie summary"
        className="flex-row items-center gap-xl"
      >
        <SkeletonBlock className="h-[100px] w-[100px] rounded-pill" />
        <View className="flex-1 gap-xs">
          <SkeletonText size="heading" className="w-2/3" />
          <SkeletonText className="w-full" />
          <SkeletonText className="w-1/2" />
        </View>
      </View>
    );
  }

  if (calories.isError || !calories.data) {
    return (
      <SectionError
        title="Could not load calories"
        message="Your calorie summary is unavailable right now."
        onRetry={() => void calories.refetch()}
      />
    );
  }

  const { consumedCalories, targetCalories, remainingCalories } = calories.data;

  return (
    <View className="flex-row items-center gap-xl">
      {/* No `emptyLabel`: the Figma frames show the ring reading "0% Used" at
          zero, not a prompt. `CalorieRing` still supports the prompt for any
          caller that wants it. */}
      <CalorieRing consumed={consumedCalories} target={targetCalories} />
      <View className="flex-1 gap-xs">
        <View className="flex-row items-baseline gap-xs">
          <AnimatedNumber variant="heading2" color="dark" value={consumedCalories} />
          <Text variant="body" color="subtle">
            kcal
          </Text>
        </View>
        <AnimatedNumber
          variant="body"
          color="muted"
          value={targetCalories}
          format={(n) => `of ${formatNumber(n)} daily target`}
        />
        <AnimatedNumber
          variant="body"
          color="primary"
          value={remainingCalories}
          format={(n) => `${formatNumber(n)} remaining`}
        />
      </View>
    </View>
  );
}

export function MacrosSection() {
  const macros = useDashboardMacros();

  if (macros.isEntitlementLoading || macros.isLoading) {
    return (
      <Card
        accessibilityRole="progressbar"
        accessibilityLabel="Loading macros"
        style={styles.macroCardShadow}
      >
        <View className="gap-lg">
          {["protein", "carbs", "fat"].map((label) => (
            <View key={label} className="flex-row items-center gap-md">
              <SkeletonText className="w-labelColumn" />
              <SkeletonBlock className="h-[8px] flex-1 rounded-pill" />
              <SkeletonText className="w-readoutColumn" />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  // Macros are premium. The teaser behind the glass is a zeroed card at derived
  // targets, not the user's real numbers — the gate must not leak what it hides.
  if (macros.isGated) {
    return (
      <PremiumGate
        title="Subscribe to see your macros"
        subtitle="Unlock your full nutrition progress."
        onViewPlans={() => router.push("/(app)/subscription")}
      >
        <MacroCard consumed={ZERO_MACROS} target={deriveMacroTargets(DEFAULT_TARGET_CALORIES)} />
      </PremiumGate>
    );
  }

  if (macros.isError || !macros.data) {
    return (
      <SectionError
        title="Could not load macros"
        message="Macro progress will return when the connection does."
        onRetry={() => void macros.refetch()}
      />
    );
  }

  return (
    <MacroCard consumed={macros.data.consumed} target={macros.data.target} onPress={goToProgress} />
  );
}

function MacroCard({
  consumed,
  target,
  onPress,
}: {
  consumed: { proteinG: number; carbsG: number; fatG: number };
  target: { proteinG: number; carbsG: number; fatG: number };
  // Only the real card opens Progress; the gated teaser behind the glass keeps
  // the gate's own "view plans" as its single action.
  onPress?: () => void;
}) {
  const card = (
    <Card className="border-light" style={[styles.macroCard, styles.macroCardShadow]}>
      <MacroBars consumed={consumed} target={target} />
    </Card>
  );

  if (!onPress) return card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View your macro progress"
      onPress={onPress}
    >
      {card}
    </Pressable>
  );
}

export function StreakSection() {
  const streak = useDashboardStreak();

  if (streak.isLoading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading streak"
        className="gap-sm rounded-lg bg-accentSoft p-md"
      >
        <SkeletonText className="w-2/3" />
        <SkeletonText size="caption" className="w-1/2" />
      </View>
    );
  }

  if (streak.isError || !streak.data) {
    return (
      <SectionError
        title="Could not load streak"
        message="Your streak status is unavailable right now."
        onRetry={() => void streak.refetch()}
      />
    );
  }

  return streak.data.currentStreakDays > 0 ? (
    <StreakBanner days={streak.data.currentStreakDays} onPress={goToProgressCalendar} />
  ) : null;
}

export function WaterSection() {
  const water = useDashboardWater();
  const addWater = useAddWater();

  if (water.isLoading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading water tracker"
        className="gap-sm rounded-lg bg-light px-lg py-md"
      >
        <View className="flex-row items-center">
          <SkeletonBlock className="h-iconSm w-iconSm rounded-pill" />
          <SkeletonText className="ml-sm flex-1" />
          <SkeletonBlock className="h-icon w-icon rounded-pill" />
        </View>
        <View className="flex-row items-center">
          <SkeletonText className="flex-1" />
          <View className="flex-row gap-xs">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-[20px] w-[14px] rounded-pill" />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (water.isError || !water.data) {
    return (
      <SectionError
        title="Could not load water"
        message="Water tracking is unavailable right now."
        onRetry={() => void water.refetch()}
      />
    );
  }

  const glasses = water.data.glasses ?? Math.round(water.data.totalMl / GLASS_ML);
  const targetGlasses = water.data.targetGlasses ?? Math.round(water.data.targetMl / GLASS_ML);

  return (
    <WaterTracker
      glasses={glasses}
      targetGlasses={targetGlasses}
      adding={addWater.isPending}
      error={addWater.error?.message ?? null}
      onAdd={() => addWater.mutate()}
      onOpen={goToWaterLog}
    />
  );
}

export function TodayMealLogSection() {
  const foodLog = useDashboardMealLog();
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  if (foodLog.isLoading) {
    return (
      <Card accessibilityRole="progressbar" accessibilityLabel="Loading today's meal log">
        <View className="gap-xl">
          {["Breakfast", "Lunch"].map((meal) => (
            <View key={meal} className="gap-sm">
              <View className="mb-xs flex-row justify-between border-b border-gray-200 pb-sm">
                <SkeletonText className="w-1/3" />
                <SkeletonText className="w-1/5" />
              </View>
              <View className="flex-row justify-between">
                <SkeletonText className="w-1/2" />
                <SkeletonText className="w-1/5" />
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  }

  if (foodLog.isError) {
    return (
      <SectionError
        title="Could not load meals"
        message="Your other dashboard sections are still available."
        onRetry={() => void foodLog.refetch()}
      />
    );
  }

  const entries = foodLog.data?.entries ?? [];

  // An empty day renders the same meal-log block as a full one — the rule and
  // the "Log food" row (Figma 371:445) — rather than a separate empty-state
  // card. One layout, so the section does not change shape as the day fills up.
  return (
    <>
      <MealLog
        entries={entries}
        onLogFood={goToLog}
        onViewAll={goToHistory}
        onEntryPress={setEditingEntry}
      />
      <EditFoodLogSheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
      />
    </>
  );
}
