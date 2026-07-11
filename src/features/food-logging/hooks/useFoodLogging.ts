import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  invalidateFoodLogViews,
  invalidateWaterViews,
  offlineMutationKeys,
  queryKeys,
  useOfflineWrite,
  type AddWaterVars,
  type LogEstimateVars,
  type LogFoodVars,
} from "@/api";
import { useFavoritesActions, useFavoriteIds } from "@/stores";
import { localDay } from "@/utils";
import type {
  EstimateFoodPayload,
  FavoritesListResponse,
  LogEstimatePayload,
  LogFoodPayload,
  UpdateLogPayload,
} from "@/contracts";
import {
  addFavorite,
  deleteFoodLog,
  deleteWater,
  estimateFood,
  getFavorites,
  getFoodLogDay,
  getRecentFoods,
  getWater,
  lookupFood,
  removeFavorite,
  searchFoods,
  updateFoodLog,
} from "../api/food-logging.api";

export function useFoodSearch(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ");
  return useQuery({
    queryKey: queryKeys.foods.search(normalized),
    queryFn: () => searchFoods(normalized),
    enabled: normalized.length >= 2,
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

/** Fetches favorites AND keeps the device-local favorites store in sync. */
export function useFavorites() {
  const query = useQuery({
    queryKey: queryKeys.foods.favorites(),
    queryFn: getFavorites,
    staleTime: 1000 * 60,
  });
  const { setFavoriteIds } = useFavoritesActions();

  useEffect(() => {
    if (query.data) setFavoriteIds(query.data.items.map((item) => item.id));
  }, [query.data, setFavoriteIds]);

  return query;
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
  // Offline-first: queues + syncs on reconnect, idempotency-keyed (see api/offline-mutations).
  return useOfflineWrite<LogFoodPayload, LogFoodVars>(
    offlineMutationKeys.logFood,
    (payload, idempotencyKey) => ({ payload, idempotencyKey })
  );
}

export function useLogEstimate() {
  return useOfflineWrite<LogEstimatePayload, LogEstimateVars>(
    offlineMutationKeys.logEstimate,
    (payload, idempotencyKey) => ({ payload, idempotencyKey })
  );
}

export function useUpdateFoodLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateLogPayload) =>
      updateFoodLog(id, payload),
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

/**
 * R5-1: add/remove now return the single mutated item instead of a full
 * re-list, so the client patches the favorites cache in place — one round
 * trip instead of re-fetching the whole list on every heart-tap. Prepending
 * on add (and de-duping any existing copy) approximates the server's
 * most-used/most-recent ordering closely enough for the gap until the next
 * real refetch; the list query itself remains the source of truth.
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: string) => addFavorite({ foodItemId }),
    onSuccess: ({ item }) => {
      if (!item) return;
      queryClient.setQueryData<FavoritesListResponse>(queryKeys.foods.favorites(), (prev) =>
        prev ? { items: [item, ...prev.items.filter((existing) => existing.id !== item.id)] } : prev
      );
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodItemId: string) => removeFavorite(foodItemId),
    onSuccess: (_data, foodItemId) => {
      queryClient.setQueryData<FavoritesListResponse>(queryKeys.foods.favorites(), (prev) =>
        prev ? { items: prev.items.filter((existing) => existing.id !== foodItemId) } : prev
      );
    },
  });
}

/**
 * Single toggle for every favorite heart in the app. Updates the local
 * favorites store immediately (instant feedback everywhere, not just the
 * screen that was tapped) and rolls back if the server call fails.
 */
export function useToggleFavorite() {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const favoriteIds = useFavoriteIds();
  const { addFavoriteId, removeFavoriteId } = useFavoritesActions();

  return (foodItemId: string) => {
    if (favoriteIds.includes(foodItemId)) {
      removeFavoriteId(foodItemId);
      removeFavorite.mutate(foodItemId, { onError: () => addFavoriteId(foodItemId) });
    } else {
      addFavoriteId(foodItemId);
      addFavorite.mutate(foodItemId, { onError: () => removeFavoriteId(foodItemId) });
    }
  };
}

export function useAddWaterLog(day = localDay()) {
  // Offline-first with an optimistic day-total bump (see api/offline-mutations).
  return useOfflineWrite<number, AddWaterVars>(
    offlineMutationKeys.addWater,
    (amountMl, idempotencyKey) => ({ amountMl, day, idempotencyKey })
  );
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
