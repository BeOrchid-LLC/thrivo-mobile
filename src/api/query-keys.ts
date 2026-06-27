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
    calories: (day: string) => ["dashboard", "calories", day] as const,
    macros: (day: string) => ["dashboard", "macros", day] as const,
    streak: () => ["dashboard", "streak"] as const,
  },

  foods: {
    search: (q: string) => ["foods", "search", q] as const,
    lookup: (barcode: string) => ["foods", "lookup", barcode] as const,
    detail: (id: string) => ["foods", "detail", id] as const,
    recent: () => ["foods", "recent"] as const,
    favorites: () => ["foods", "favorites"] as const,
    logHistory: () => ["foods", "log", "history"] as const,
    logDay: (day: string) => ["foods", "log", "day", day] as const,
  },

  metrics: {
    weight: () => ["metrics", "weight"] as const,
    waterByDay: (day: string) => ["metrics", "water", day] as const,
  },

  checkins: {
    byDay: (day: string) => ["checkins", day] as const,
  },

  settings: {
    me: () => ["settings", "me"] as const,
  },

  subscription: {
    me: () => ["subscription", "me"] as const,
  },
} as const;
