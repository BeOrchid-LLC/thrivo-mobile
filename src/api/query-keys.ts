/**
 * Centralized, structured query keys (MOBILE_ARCHITECTURE §4.1). Per-feature
 * factories prevent typo-drift and make invalidation precise. Always reference
 * these — never inline a key array at a call site.
 */
export const queryKeys = {
  me: () => ["me"] as const,

  dashboard: {
    all: () => ["dashboard"] as const,
    byDay: (day: string) => ["dashboard", day] as const,
  },

  foods: {
    search: (q: string) => ["foods", "search", q] as const,
    lookup: (barcode: string) => ["foods", "lookup", barcode] as const,
    favorites: () => ["foods", "favorites"] as const,
    logHistory: () => ["foods", "log", "history"] as const,
  },

  metrics: {
    weight: () => ["metrics", "weight"] as const,
    waterByDay: (day: string) => ["metrics", "water", day] as const,
  },

  checkins: {
    byDay: (day: string) => ["checkins", day] as const,
  },

  subscription: {
    me: () => ["subscription", "me"] as const,
  },
} as const;
