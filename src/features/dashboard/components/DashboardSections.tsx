import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ForkKnife } from "phosphor-react-native";
import {
  Button,
  Card,
  CalorieRing,
  SectionError,
  SkeletonBlock,
  SkeletonText,
  Text,
} from "@/components";
import { colors } from "@/theme";
import { MacroBars } from "./MacroBars";
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

const goToLog = () => router.push("/(app)/log");
const goToHistory = () => router.push("/(app)/history");

const styles = StyleSheet.create({
  macroCardShadow: {
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
});

export function CaloriesSummarySection() {
  const calories = useDashboardCalories();

  if (calories.isLoading) {
    return (
      <Card
        accessibilityRole="progressbar"
        accessibilityLabel="Loading calorie summary"
        className="flex-row items-center gap-lg"
      >
        <SkeletonBlock className="h-[132px] w-[132px] rounded-pill" />
        <View className="flex-1 gap-sm">
          <SkeletonText size="heading" className="w-2/3" />
          <SkeletonText className="w-full" />
          <SkeletonText className="w-1/2" />
        </View>
      </Card>
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
    <Card className="flex-row items-center gap-lg border-transparent pl-0">
      <CalorieRing
        consumed={consumedCalories}
        target={targetCalories}
        emptyLabel="Log your first meal"
      />
      <View className="flex-1 gap-xs">
        <View className="flex-row items-baseline gap-xs">
          <Text variant="heading1" color="dark">
            {consumedCalories.toLocaleString()}
          </Text>
          <Text className="mb-2 text-lg font-normal text-muted">kcal</Text>
        </View>
        <Text variant="body" color="muted">
          of {targetCalories.toLocaleString()} daily target
        </Text>
        <Text variant="body" color="primary">
          {remainingCalories.toLocaleString()} remaining
        </Text>
      </View>
    </Card>
  );
}

export function MacrosSection() {
  const macros = useDashboardMacros();

  if (macros.isLoading) {
    return (
      <Card
        accessibilityRole="progressbar"
        accessibilityLabel="Loading macros"
        style={styles.macroCardShadow}
      >
        <View className="gap-md">
          {["protein", "carbs", "fat"].map((label) => (
            <View key={label} className="gap-xs">
              <View className="flex-row justify-between">
                <SkeletonText className="w-1/4" />
                <SkeletonText size="caption" className="w-1/5" />
              </View>
              <SkeletonBlock className="h-[8px] rounded-pill" />
            </View>
          ))}
        </View>
      </Card>
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
    <Card className="border-2 border-gray-2" style={styles.macroCardShadow}>
      <MacroBars
        consumed={{
          proteinG: macros.data.consumed.proteinG,
          carbsG: macros.data.consumed.carbsG,
          fatG: macros.data.consumed.fatG,
        }}
        target={macros.data.target}
      />
    </Card>
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
    <StreakBanner days={streak.data.currentStreakDays} />
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
        className="gap-sm rounded-[16px] bg-gray-2 px-lg py-md"
      >
        <View className="flex-row items-center">
          <SkeletonBlock className="h-[22px] w-[22px] rounded-pill" />
          <SkeletonText className="ml-sm flex-1" />
          <SkeletonBlock className="h-[24px] w-[24px] rounded-pill" />
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

  const glasses = water.data.glasses ?? Math.floor(water.data.totalMl / GLASS_ML);
  const targetGlasses = water.data.targetGlasses ?? Math.round(water.data.targetMl / GLASS_ML);

  return (
    <WaterTracker
      glasses={glasses}
      targetGlasses={targetGlasses}
      adding={addWater.isPending}
      error={addWater.error?.message ?? null}
      onAdd={() => addWater.mutate()}
    />
  );
}

export function TodayMealLogSection() {
  const foodLog = useDashboardMealLog();

  if (foodLog.isLoading) {
    return (
      <Card accessibilityRole="progressbar" accessibilityLabel="Loading today's meal log">
        <View className="gap-md">
          {["Breakfast", "Lunch"].map((meal) => (
            <View key={meal} className="gap-sm">
              <View className="flex-row justify-between border-b border-gray-200 pb-sm">
                <SkeletonText className="w-1/3" />
                <SkeletonText size="caption" className="w-1/5" />
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

  return entries.length > 0 ? (
    <MealLog entries={entries} onLogFood={goToLog} onViewAll={goToHistory} />
  ) : (
    <View className="items-center gap-md rounded-[16px] bg-primaryBright/10 px-8 py-6">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-primarySoft">
        <ForkKnife size={28} color={colors.primary} weight="regular" />
      </View>
      <Text variant="heading3" color="dark" className="text-center">
        Nothing logged yet
      </Text>
      <Text variant="body" className="text-center text-muted">
        Scan a barcode, search the database or describe what you ate to get started.
      </Text>
      <Button label="Log first meal" onPress={() => goToLog()} />
    </View>
  );
}
