import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { localDay } from "@/utils";
import {
  addWater,
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

/** Logs one glass (250ml) and refreshes the dashboard + water queries. */
export function useAddWater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => addWater(GLASS_ML),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.waterByDay(localDay()) });
    },
  });
}
