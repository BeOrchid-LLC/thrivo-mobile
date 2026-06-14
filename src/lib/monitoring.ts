/**
 * Crash/error reporting seam (Sentry — MOBILE_ARCHITECTURE §1). Stubbed behind
 * an interface so feature code calls `monitoring.captureException(...)` today and
 * the real Sentry SDK swaps in later (needs a DSN) without touching call sites.
 */
export interface Monitoring {
  init: () => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  setUser: (user: { id: string } | null) => void;
}

const consoleMonitoring: Monitoring = {
  init: () => {
    if (__DEV__) console.info("[monitoring] init (stub — Sentry not wired)");
  },
  captureException: (error, context) => {
    if (__DEV__) console.error("[monitoring] captureException", error, context);
  },
  setUser: (user) => {
    if (__DEV__) console.info("[monitoring] setUser", user?.id ?? "anonymous");
  },
};

export const monitoring: Monitoring = consoleMonitoring;
