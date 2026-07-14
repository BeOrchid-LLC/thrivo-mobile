import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { Water } from "@/contracts";
import { useAddWaterLog } from "@/features/food-logging";
import { localDay } from "@/utils";
import {
  getDashboardCalories,
  getDashboardMacros,
  getDashboardStreak,
  getDashboardWater,
  getFoodLogHistory,
  getMealLogDay,
} from "../api/dashboard.api";

const GLASS_ML = 250;

export function useDashboardCalories(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.dashboard.calories(day),
    queryFn: () => getDashboardCalories(day),
    staleTime: 1000 * 60,
  });
}

export function useDashboardMacros(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.dashboard.macros(day),
    queryFn: () => getDashboardMacros(day),
    staleTime: 1000 * 60,
  });
}

export function useDashboardStreak() {
  return useQuery({
    queryKey: queryKeys.dashboard.streak(),
    queryFn: getDashboardStreak,
    staleTime: 1000 * 60,
  });
}

export function useDashboardWater(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.waterByDay(day),
    queryFn: () => getDashboardWater(day),
    staleTime: 1000 * 60,
  });
}

export function useDashboardMealLog(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.foods.logDay(day),
    queryFn: () => getMealLogDay(day),
    staleTime: 1000 * 60,
  });
}

export function useFoodLogHistory() {
  return useQuery({
    queryKey: queryKeys.foods.logHistory(),
    queryFn: getFoodLogHistory,
    staleTime: 1000 * 60,
  });
}

/** Logs one glass using the same offline/idempotent water write as the log tab. */
export function useAddWater() {
  const queryClient = useQueryClient();
  const day = localDay();
  const addWater = useAddWaterLog(day);
  const cached = queryClient.getQueryData<Water>(queryKeys.metrics.waterByDay(day));
  const amountMl = cached?.glassMl ?? GLASS_ML;

  return {
    ...addWater,
    mutate: (options?: Parameters<typeof addWater.mutate>[1]) => addWater.mutate(amountMl, options),
    mutateAsync: (options?: Parameters<typeof addWater.mutateAsync>[1]) =>
      addWater.mutateAsync(amountMl, options),
  };
}
