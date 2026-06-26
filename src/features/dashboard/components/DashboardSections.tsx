import { router } from "expo-router";
import { View } from "react-native";
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
import type { MealType } from "@/contracts";
import { deriveMacroTargets } from "@/features/onboarding/utils/tdee";
import { MacroBars } from "./MacroBars";
import { MealLog } from "./MealLog";
import { StreakBanner } from "./StreakBanner";
import { WaterTracker } from "./WaterTracker";
import { useAddWater, useDashboard, useTodayFoodLog } from "../hooks/useDashboard";

const GLASS_ML = 250;

const goToLog = (_meal?: MealType) => router.push("/(app)/log");

export function CaloriesSummarySection() {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
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

  if (dashboard.isError || !dashboard.data) {
    return (
      <SectionError
        title="Could not load calories"
        message="Your calorie summary is unavailable right now."
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const { consumed, targetCalories } = dashboard.data;
  const remaining = Math.max(targetCalories - consumed.calories, 0);

  return (
    <Card className="flex-row items-center gap-lg">
      <CalorieRing
        consumed={consumed.calories}
        target={targetCalories}
        emptyLabel="Log your first meal"
      />
      <View className="flex-1 gap-xs">
        <Text variant="heading1" color="dark">
          {consumed.calories.toLocaleString()}
        </Text>
        <Text variant="body" color="muted">
          of {targetCalories.toLocaleString()} daily target
        </Text>
        <Text variant="body" color="primary">
          {remaining.toLocaleString()} remaining
        </Text>
      </View>
    </Card>
  );
}

export function MacrosSection() {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
    return (
      <Card accessibilityRole="progressbar" accessibilityLabel="Loading macros">
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

  if (dashboard.isError || !dashboard.data) {
    return (
      <SectionError
        title="Could not load macros"
        message="Macro progress will return when the connection does."
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const { consumed, targetCalories } = dashboard.data;
  const macroTarget =
    dashboard.data.targetProteinG && dashboard.data.targetCarbsG && dashboard.data.targetFatG
      ? {
          proteinG: dashboard.data.targetProteinG,
          carbsG: dashboard.data.targetCarbsG,
          fatG: dashboard.data.targetFatG,
        }
      : deriveMacroTargets(targetCalories);

  return (
    <Card>
      <MacroBars
        consumed={{
          proteinG: consumed.proteinG,
          carbsG: consumed.carbsG,
          fatG: consumed.fatG,
        }}
        target={macroTarget}
      />
    </Card>
  );
}

export function StreakSection() {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
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

  if (dashboard.isError || !dashboard.data) {
    return (
      <SectionError
        title="Could not load streak"
        message="Your streak status is unavailable right now."
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  return dashboard.data.streakDays && dashboard.data.streakDays > 0 ? (
    <StreakBanner days={dashboard.data.streakDays} />
  ) : null;
}

export function WaterSection() {
  const dashboard = useDashboard();
  const addWater = useAddWater();

  if (dashboard.isLoading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading water tracker"
        className="gap-sm rounded-[16px] bg-primarySoft px-lg py-md"
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

  if (dashboard.isError || !dashboard.data) {
    return (
      <SectionError
        title="Could not load water"
        message="Water tracking is unavailable right now."
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const glasses = Math.round((dashboard.data.waterMl ?? 0) / GLASS_ML);

  return (
    <WaterTracker
      glasses={glasses}
      adding={addWater.isPending}
      error={addWater.error?.message ?? null}
      onAdd={() => addWater.mutate()}
    />
  );
}

export function TodayMealLogSection() {
  const foodLog = useTodayFoodLog();

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

  const entries = foodLog.data ?? [];

  return entries.length > 0 ? (
    <MealLog entries={entries} onLogFood={goToLog} />
  ) : (
    <Card className="items-center gap-md">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-primarySoft">
        <ForkKnife size={28} color={colors.primary} weight="regular" />
      </View>
      <Text variant="heading3" color="dark" className="text-center">
        Nothing logged yet
      </Text>
      <Text variant="body" color="muted" className="text-center">
        Scan a barcode, search the database or describe what you ate to get started.
      </Text>
      <Button label="Log first meal" onPress={() => goToLog()} />
    </Card>
  );
}
