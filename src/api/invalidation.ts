import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export function invalidateFoodLogViews(queryClient: QueryClient, day: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.foods.logDay(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.foods.recent() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.foods.logHistory() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.calories(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.macros(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.streak() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.progress(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.chartRoot() });
}

export function invalidateWaterViews(queryClient: QueryClient, day: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.waterByDay(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.progress(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.chartRoot() });
}

export function invalidateWeightViews(queryClient: QueryClient, day: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.progress(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.weightContext(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.chartRoot() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.calories(day) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.macros(day) });
}
