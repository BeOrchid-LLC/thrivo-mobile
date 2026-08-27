import { useState } from "react";
import { View } from "react-native";
import { queryClient, queryKeys } from "@/api";
import { Screen } from "@/components";
import {
  CaloriesSummarySection,
  DashboardHeader,
  MacrosSection,
  MoodCheckinSection,
  StreakSection,
  TodayMealLogSection,
  WaterSection,
} from "@/features/dashboard";
import { localDay } from "@/utils";

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const day = localDay();
  const refresh = () => {
    setRefreshing(true);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.calories(day) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.macros(day) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.streak() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.metrics.waterByDay(day) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.foods.logDay(day) }),
    ]).finally(() => setRefreshing(false));
  };

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      rhythm="default"
      header={<DashboardHeader />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <View className="gap-lg">
        <MoodCheckinSection />
        <CaloriesSummarySection />
        <MacrosSection />
        <StreakSection />
        <WaterSection />
        <TodayMealLogSection />
      </View>
    </Screen>
  );
}
