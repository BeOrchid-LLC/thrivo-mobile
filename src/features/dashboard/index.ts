export { MacroBars } from "./components/MacroBars";
export type { MacroTotals } from "./components/MacroBars";
export { StreakBanner } from "./components/StreakBanner";
export { WaterTracker } from "./components/WaterTracker";
export { MealLog } from "./components/MealLog";
export { DashboardHeader } from "./components/DashboardHeader";
export { FoodHistoryScreen } from "./components/FoodHistoryScreen";
export {
  CaloriesSummarySection,
  MacrosSection,
  StreakSection,
  WaterSection,
  TodayMealLogSection,
} from "./components/DashboardSections";
export {
  useAddWater,
  useDashboardCalories,
  useDashboardMacros,
  useDashboardMealLog,
  useDashboardStreak,
  useDashboardWater,
  useFoodLogHistory,
} from "./hooks/useDashboard";
