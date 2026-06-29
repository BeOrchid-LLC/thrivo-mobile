import * as Sentry from "@sentry/react-native";
import { env } from "@/config/env";

/**
 * Crash/error reporting (Sentry — MOBILE_ARCHITECTURE §1). The `Monitoring`
 * interface is the seam feature code calls (`monitoring.captureException(...)`);
 * the implementation is the real Sentry SDK when `EXPO_PUBLIC_SENTRY_DSN` is set,
 * and a no-op (dev console) otherwise. A production build without a DSN never
 * reaches here — `env` throws at bootstrap (fail fast).
 */
export interface Monitoring {
  init: () => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  setUser: (user: { id: string } | null) => void;
}

let initialized = false;

const sentryMonitoring: Monitoring = {
  init: () => {
    if (initialized || !env.sentryDsn) return;
    Sentry.init({
      dsn: env.sentryDsn,
      // Fewer traces in prod; full traces in dev for local debugging.
      tracesSampleRate: env.isProduction ? 0.2 : 1.0,
      // PII stays out of breadcrumbs — we attach only the opaque user id via setUser.
      sendDefaultPii: false,
      enabled: true,
    });
    initialized = true;
  },
  captureException: (error, context) => {
    if (env.sentryDsn) {
      Sentry.captureException(error, context ? { extra: context } : undefined);
      return;
    }
    if (__DEV__) console.error("[monitoring] captureException", error, context);
  },
  setUser: (user) => {
    if (env.sentryDsn) {
      Sentry.setUser(user ? { id: user.id } : null);
      return;
    }
    if (__DEV__) console.info("[monitoring] setUser", user?.id ?? "anonymous");
  },
};

export const monitoring: Monitoring = sentryMonitoring;

/**
 * Wrap the root component so Sentry captures render errors + native crashes.
 * A no-op passthrough when no DSN is configured (dev/local).
 */
export const withMonitoring: typeof Sentry.wrap = (Component) =>
  env.sentryDsn ? Sentry.wrap(Component) : Component;
