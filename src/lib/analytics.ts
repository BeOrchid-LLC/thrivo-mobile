/**
 * Product analytics seam (Mixpanel — ADR-0010). Stubbed behind an interface so
 * funnel events are instrumented now and the real SDK swaps in later. Event
 * names are constrained to the funnel the architecture doc tracks (§11).
 */
export type AnalyticsEvent =
  | "signup"
  | "paywall_view"
  | "trial_start"
  | "subscription_start"
  | "cancellation"
  | "food_logged"
  | "checkin_submitted";

export interface Analytics {
  init: () => void;
  identify: (userId: string) => void;
  track: (event: AnalyticsEvent, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

const consoleAnalytics: Analytics = {
  init: () => {
    if (__DEV__) console.info("[analytics] init (stub — Mixpanel not wired)");
  },
  identify: (userId) => {
    if (__DEV__) console.info("[analytics] identify", userId);
  },
  track: (event, properties) => {
    if (__DEV__) console.info("[analytics] track", event, properties ?? {});
  },
  reset: () => {
    if (__DEV__) console.info("[analytics] reset");
  },
};

export const analytics: Analytics = consoleAnalytics;
