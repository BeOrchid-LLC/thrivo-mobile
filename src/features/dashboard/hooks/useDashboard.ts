import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { localDay } from "@/utils";
import { addWater, getDashboard, getTodayFoodLog } from "../api/dashboard.api";

const GLASS_ML = 250;

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.byDay(localDay()),
    queryFn: getDashboard,
    staleTime: 1000 * 60,
  });
}

export function useTodayFoodLog() {
  return useQuery({
    queryKey: queryKeys.foods.logHistory(),
    queryFn: getTodayFoodLog,
    staleTime: 1000 * 60,
  });
}

/** Logs one glass (250ml) and refreshes the dashboard + water queries. */
export function useAddWater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => addWater(GLASS_ML),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.metrics.waterByDay(localDay()) });
    },
  });
}
