import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { analytics, isNetworkReachable } from "@/lib";
import { useFavoritesActions, useFavoritesStore } from "@/stores";
import { localDay } from "@/utils";
import type {
  ChartPeriod,
  EstimateFoodPayload,
  FavoritesListResponse,
  FoodItem,
  FoodLogEntry,
  LogEstimatePayload,
  LogFoodPayload,
  UpdateLogPayload,
  UpdateWaterPayload,
  UpsertFoodPayload,
} from "@/contracts";
import {
  addFavorite,
  createFood,
  deleteFoodLog,
  deleteWater,
  estimateFood,
  getFavorites,
  getFoodDetail,
  getFoodLogDay,
  getRecentFoods,
  getWater,
  getWaterHistory,
  lookupFood,
  removeFavorite,
  searchFoods,
  updateFoodLog,
  updateWater,
  type WaterHistoryFilters,
} from "../api/food-logging.api";
import { buildCopyPlan } from "../utils/copyLog";

const FOOD_SEARCH_PAGE_SIZE = 10;

/**
 * Catalog-first search with cursor pages (local then OFF). Auto-fetches the
 * first external page when the local page is empty so the sheet never shows
 * a blank “no results” flash before OFF fills in.
 */
export function useFoodSearch(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ");
  const enabled = normalized.length >= 2;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, ...rest } =
    useInfiniteQuery({
      queryKey: queryKeys.foods.search(normalized),
      queryFn: ({ pageParam }) =>
        searchFoods(normalized, {
          limit: FOOD_SEARCH_PAGE_SIZE,
          cursor: pageParam,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled,
      staleTime: 1000 * 60,
    });

  const firstPage = data?.pages[0];
  const shouldAutoFetchExternal =
    enabled &&
    Boolean(firstPage) &&
    Boolean(firstPage!.nextCursor?.startsWith("external:")) &&
    Boolean(hasNextPage) &&
    !isFetchingNextPage &&
    !isFetchNextPageError;

  useEffect(() => {
    if (shouldAutoFetchExternal) void fetchNextPage();
  }, [shouldAutoFetchExternal, fetchNextPage]);

  const items = Array.from(
    new Map(
      (data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item])
    ).values()
  );

  return {
    ...rest,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    items,
  };
}

export function useBarcodeLookup(barcode: string | null) {
  return useQuery({
    queryKey: queryKeys.foods.lookup(barcode ?? ""),
    queryFn: () => lookupFood(barcode ?? ""),
    enabled: Boolean(barcode),
    staleTime: 1000 * 60 * 10,
  });
}

/** Fetches a catalog food's current serving options, e.g. to seed a unit switcher. */
export function useFoodDetail(foodItemId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.foods.detail(foodItemId ?? ""),
    queryFn: () => getFoodDetail(foodItemId as string),
    enabled: enabled && Boolean(foodItemId),
  });
}

export function useFoodLogDay(day = localDay(), enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.foods.logDay(day),
    queryFn: () => getFoodLogDay(day),
    enabled,
    staleTime: 1000 * 60,
  });
  useSyncFavoriteStatusesFromEntries(query.data?.entries);
  return query;
}

export function useRecentFoods() {
  const query = useQuery({
    queryKey: queryKeys.foods.recent(),
    queryFn: getRecentFoods,
    staleTime: 1000 * 60,
  });
  useSyncFavoriteStatusesFromEntries(query.data?.items);
  return query;
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

export function useSyncFavoriteStatusesFromEntries(
  entries: readonly FoodLogEntry[] | null | undefined
) {
  const { applyFavoriteStatuses } = useFavoritesActions();
  useEffect(() => {
    if (!entries) return;
    applyFavoriteStatuses(
      entries.map((entry) => ({ id: entry.foodItemId, isFavorite: Boolean(entry.isFavorite) }))
    );
  }, [entries, applyFavoriteStatuses]);
}

export function useSyncFavoriteStatusesFromItems(items: readonly FoodItem[] | null | undefined) {
  const { applyFavoriteStatuses } = useFavoritesActions();
  useEffect(() => {
    if (!items) return;
    applyFavoriteStatuses(
      items.map((item) => ({ id: item.id, isFavorite: Boolean(item.isFavorite) }))
    );
  }, [items, applyFavoriteStatuses]);
}

export function useWater(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.waterByDay(day),
    queryFn: () => getWater(day),
    staleTime: 1000 * 60,
  });
}

export function useWaterHistory(
  period: ChartPeriod,
  day = localDay(),
  filters: WaterHistoryFilters = {}
) {
  return useInfiniteQuery({
    queryKey: queryKeys.metrics.waterHistory(period, day, filters as Record<string, unknown>),
    queryFn: ({ pageParam }) => getWaterHistory(period, day, filters, pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
 * Creates a personal food (`POST /foods`). The new item is only visible to its
 * owner, so the caches that can already contain it — catalog search and the
 * recent list — are dropped rather than patched; the next read is authoritative.
 */
export function useCreateFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertFoodPayload) => createFood(payload),
    onSuccess: () => {
      analytics.track("thrivo.custom_food_created");
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.searchRoot() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.recent() });
    },
  });
}

export interface CopyResult {
  copied: number;
  failed: number;
  /** Entries with no catalog link (described-meal estimates) — never sent. */
  skipped: number;
  /** Queued offline instead of sent; they replay on reconnect. */
  queued: number;
}

/**
 * Re-logs a set of past entries onto another day, one `POST /foods/log` per
 * entry — there is no bulk endpoint, and inventing one client-side would mean
 * duplicating the server's portion maths.
 *
 * Sequential on purpose: `useOfflineWrite` wraps a single mutation observer, and
 * firing overlapping `mutateAsync` calls through it would drop all but the last
 * call's result. Offline, the writes are queued (idempotency-keyed) and reported
 * as queued rather than pretending they landed.
 */
export function useCopyFoodLog() {
  const logFood = useLogFood();
  const [isCopying, setIsCopying] = useState(false);

  const copy = async (
    entries: readonly FoodLogEntry[],
    targetDay: string,
    scope: "day" | "meal"
  ): Promise<CopyResult> => {
    const plan = buildCopyPlan(entries, targetDay);
    if (plan.payloads.length === 0) {
      return { copied: 0, failed: 0, skipped: plan.skipped, queued: 0 };
    }

    setIsCopying(true);
    try {
      if (!(await isNetworkReachable())) {
        for (const payload of plan.payloads) logFood.mutate(payload);
        return { copied: 0, failed: 0, skipped: plan.skipped, queued: plan.payloads.length };
      }

      let copied = 0;
      let failed = 0;
      for (const payload of plan.payloads) {
        try {
          await logFood.mutateAsync(payload);
          copied += 1;
        } catch {
          failed += 1;
        }
      }
      // One event per copy action, not per item — the per-item `food_logged`
      // events are already emitted by the offline write's registered default.
      if (copied > 0) analytics.track("thrivo.log_copied", { scope, count: copied });
      return { copied, failed, skipped: plan.skipped, queued: 0 };
    } finally {
      setIsCopying(false);
    }
  };

  return { copy, isCopying };
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
 *
 * Reads `favoriteIds` via `getState()` at call time rather than subscribing
 * to it (R6 I20) — this hook only needs the array at the moment of a tap, and
 * subscribing to the whole array re-rendered every mounted caller (every
 * diary/history row) on any favorite add/remove anywhere in the app. Callers
 * that need to reflect the current favorited state on screen should use the
 * scoped `useIsFavorite(id)` selector instead.
 *
 * The returned function is stabilized with `useCallback` so callers passing
 * it into a memoized row component (e.g. FoodHistoryScreen's FlashList rows)
 * don't bust that memoization on every unrelated re-render.
 */
export function useToggleFavorite() {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { addFavoriteId, removeFavoriteId } = useFavoritesActions();

  return useCallback(
    (foodItemId: string) => {
      if (useFavoritesStore.getState().favoriteIds.includes(foodItemId)) {
        removeFavoriteId(foodItemId);
        removeFavorite.mutate(foodItemId, { onError: () => addFavoriteId(foodItemId) });
      } else {
        addFavoriteId(foodItemId);
        addFavorite.mutate(foodItemId, { onError: () => removeFavoriteId(foodItemId) });
      }
    },
    // addFavorite/removeFavorite (whole useMutation results) are new objects every
    // render; only their .mutate methods are called here and react-query guarantees
    // those are stable, so depending on the objects themselves would defeat the point
    // of this useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addFavorite.mutate, removeFavorite.mutate, addFavoriteId, removeFavoriteId]
  );
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

export function useUpdateWaterLog(day = localDay()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateWaterPayload) =>
      updateWater(id, payload),
    onSuccess: () => {
      invalidateWaterViews(queryClient, day);
    },
  });
}
