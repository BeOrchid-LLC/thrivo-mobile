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
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "thrivo-query-cache",
});

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
    shouldDehydrateQuery: (query) => query.state.status === "success",
  },
};
