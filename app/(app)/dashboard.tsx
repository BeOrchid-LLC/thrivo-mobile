import { View } from "react-native";
import { Screen } from "@/components";
import {
  CaloriesSummarySection,
  DashboardHeader,
  MacrosSection,
  StreakSection,
  TodayMealLogSection,
  WaterSection,
} from "@/features/dashboard";

export default function Dashboard() {
  return (
    <Screen scroll>
      <View className="gap-lg">
        <DashboardHeader />
        <CaloriesSummarySection />
        <MacrosSection />
        <StreakSection />
        <WaterSection />
        <TodayMealLogSection />
      </View>
    </Screen>
  );
}
