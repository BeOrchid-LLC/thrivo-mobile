import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { isApiError } from "./errors";

/** One minute in ms — base unit for staleTime tuning. */
const MINUTE = 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default freshness; per-resource hooks override (profile long, dashboard short).
      staleTime: 60 * MINUTE,
      gcTime: 24 * 60 * MINUTE,
      retry: (failureCount, error) => {
        // Never retry auth/validation errors; retry transient ones up to twice.
        if (
          isApiError(error) &&
          ["UNAUTHENTICATED", "FORBIDDEN", "VALIDATION"].includes(error.code)
        )
          return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      // Offline writes fire optimistically and pause (not fail) with no network,
      // then auto-resume on reconnect. The offline-able writes register their own
      // resumable defaults (api/offline-mutations).
      networkMode: "offlineFirst",
    },
  },
});

/** AsyncStorage key holding the dehydrated query cache. */
export const QUERY_CACHE_KEY = "thrivo-query-cache";

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
});

/**
 * Removes the on-disk query cache.
 *
 * `queryClient.clear()` only empties memory; the dehydrated copy is written
 * asynchronously and survives an app kill, so after an account deletion the
 * previous user's dashboard can still be read off disk and rendered before the
 * first refetch.
 */
export async function clearPersistedQueryCache(): Promise<void> {
  await AsyncStorage.removeItem(QUERY_CACHE_KEY);
}

/**
 * Persistence options for `PersistQueryClientProvider` (wired in the root layout,
 * Phase 5). Persisting the cache to AsyncStorage lets the dashboard render
 * instantly on cold start, stale-while-revalidate (MOBILE_ARCHITECTURE §4.1).
 */
export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: 24 * 60 * MINUTE,
  dehydrateOptions: {
    // Only persist successful queries.
    shouldDehydrateQuery: (query) => {
      if (query.state.status !== "success") return false;
      // Never persist store offerings. They depend on which RevenueCat API key
      // the build was configured with, and a list cached from a run without a
      // key (or with a different one) rehydrates as a legitimate "no products
      // for sale" and silently disables the paywall on every later launch.
      const [scope, resource] = query.queryKey as [string?, string?];
      if (scope === "subscription" && resource === "offerings") return false;
      return true;
    },
    // Persist queued (paused) offline writes so they survive an app kill and
    // replay on next launch once connectivity returns.
    shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
  },
};
