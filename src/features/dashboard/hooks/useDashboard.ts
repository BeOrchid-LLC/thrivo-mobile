import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { ChartPeriod, Water } from "@/contracts";
import { useAddWaterLog, useSyncFavoriteStatusesFromEntries } from "@/features/food-logging";
import { useEntitlement } from "@/hooks/useEntitlement";
import { localDay } from "@/utils";
import type { FoodLogHistoryFilters } from "../api/dashboard.api";
import { DASHBOARD_MACROS_GATED } from "../flags";
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
  const entitlement = useEntitlement();
  // With `DASHBOARD_MACROS_GATED` off, entitlement stops deciding anything here:
  // the query runs for everyone and the section never waits on — or blurs behind
  // — an answer it no longer reads. The gated arms are what the flag restores.
  const gated = DASHBOARD_MACROS_GATED && !entitlement.isPremium;
  const query = useQuery({
    queryKey: queryKeys.dashboard.macros(day),
    queryFn: () => getDashboardMacros(day),
    enabled: !gated,
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    /** True only while the gate is on *and* the user is outside it. */
    isGated: gated,
    isPremium: entitlement.isPremium,
    isEntitlementLoading: DASHBOARD_MACROS_GATED && entitlement.isLoading,
  };
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

export function useFoodLogHistory(
  period: ChartPeriod = "1m",
  day = localDay(),
  filters: FoodLogHistoryFilters = {}
) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.foods.logHistory(period, day, filters as Record<string, unknown>),
    queryFn: ({ pageParam }) => getFoodLogHistory(period, day, filters, pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60,
  });
  const allEntries = query.data?.pages.flatMap((page) =>
    page.days.flatMap((historyDay) => historyDay.entries)
  );
  useSyncFavoriteStatusesFromEntries(allEntries);
  return query;
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
