import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateFoodLogViews, invalidateWaterViews, queryKeys } from "@/api";
import { localDay } from "@/utils";
import type { EstimateFoodPayload, LogEstimatePayload, LogFoodPayload } from "@/contracts";
import {
  addFavorite,
  addWater,
  deleteFoodLog,
  deleteWater,
  estimateFood,
  getFavorites,
  getFoodLogDay,
  getRecentFoods,
  getWater,
  logEstimate,
  logFood,
  lookupFood,
  removeFavorite,
  searchFoods,
  updateFoodLog,
} from "../api/food-logging.api";

export function useFoodSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.foods.search(query),
    queryFn: () => searchFoods(query),
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60,
  });
}

export function useBarcodeLookup(barcode: string | null) {
  return useQuery({
    queryKey: queryKeys.foods.lookup(barcode ?? ""),
    queryFn: () => lookupFood(barcode ?? ""),
    enabled: Boolean(barcode),
    staleTime: 1000 * 60 * 10,
  });
}

export function useFoodLogDay(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.foods.logDay(day),
    queryFn: () => getFoodLogDay(day),
    staleTime: 1000 * 60,
  });
}

export function useRecentFoods() {
  return useQuery({
    queryKey: queryKeys.foods.recent(),
    queryFn: getRecentFoods,
    staleTime: 1000 * 60,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.foods.favorites(),
    queryFn: getFavorites,
    staleTime: 1000 * 60,
  });
}

export function useWater(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.waterByDay(day),
    queryFn: () => getWater(day),
    staleTime: 1000 * 60,
  });
}

export function useEstimateFood() {
  return useMutation({ mutationFn: (payload: EstimateFoodPayload) => estimateFood(payload) });
}

export function useLogFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LogFoodPayload) => logFood(payload),
    onSuccess: (_data, payload) => invalidateFoodLogViews(queryClient, payload.day),
  });
}

export function useLogEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LogEstimatePayload) => logEstimate(payload),
    onSuccess: (_data, payload) => invalidateFoodLogViews(queryClient, payload.day),
  });
}

export function useUpdateFoodLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, servings }: { id: string; servings: number }) =>
      updateFoodLog(id, { servings }),
    onSuccess: (data) => invalidateFoodLogViews(queryClient, data.totals.day),
  });
}

export function useDeleteFoodLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFoodLog(id),
    onSuccess: () => invalidateFoodLogViews(queryClient, localDay()),
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: string) => addFavorite({ foodItemId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.favorites() });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: string) => removeFavorite(foodItemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.favorites() });
    },
  });
}

export function useAddWaterLog(day = localDay()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountMl: number) => addWater(amountMl, day),
    onSuccess: () => {
      invalidateWaterViews(queryClient, day);
    },
  });
}

export function useDeleteWaterLog(day = localDay()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWater(id),
    onSuccess: () => {
      invalidateWaterViews(queryClient, day);
    },
  });
}
