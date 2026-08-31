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
      {/*
        The frame's vertical rhythm is not one gap (371:295, y positions):
        question→mood 12, mood→calories 12, calories→macros 26, macros→streak
        28, streak→water 12. So the big blocks sit `xl` apart, and the two pairs
        the design groups tightly are nested at `md`.
      */}
      <View className="gap-xl">
        <View className="gap-md">
          <MoodCheckinSection />
          <CaloriesSummarySection />
        </View>
        <MacrosSection />
        <View className="gap-md">
          <StreakSection />
          <WaterSection />
        </View>
        <TodayMealLogSection />
      </View>
    </Screen>
  );
}
