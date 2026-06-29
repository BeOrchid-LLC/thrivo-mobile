import PostHog from "posthog-react-native";
import { env } from "@/config/env";

/**
 * Product analytics (PostHog — supersedes the Mixpanel seam in ADR-0010 for its
 * first-class Expo support; the funnel and event names are unchanged). The
 * `Analytics` interface is the seam feature code calls; the implementation is the
 * real PostHog client when `EXPO_PUBLIC_POSTHOG_KEY` is set, and a no-op (dev
 * console) otherwise. A production build without a key never reaches here — `env`
 * throws at bootstrap (fail fast). Event names stay constrained to the funnel the
 * architecture doc tracks (§11).
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

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!env.posthogKey) return null;
  if (!client) {
    client = new PostHog(env.posthogKey, { host: env.posthogHost });
  }
  return client;
}

const posthogAnalytics: Analytics = {
  init: () => {
    // Construction initializes the client + flushing; surface it eagerly so the
    // first event isn't what pays the setup cost.
    const instance = getClient();
    if (!instance && __DEV__) console.info("[analytics] init (no PostHog key — dev no-op)");
  },
  identify: (userId) => {
    const instance = getClient();
    if (instance) {
      instance.identify(userId);
      return;
    }
    if (__DEV__) console.info("[analytics] identify", userId);
  },
  track: (event, properties) => {
    const instance = getClient();
    if (instance) {
      // Our seam allows arbitrary `unknown` values; PostHog narrows to JSON. We
      // only ever pass JSON-serializable funnel props, so the cast is safe.
      instance.capture(event, properties as Parameters<typeof instance.capture>[1]);
      return;
    }
    if (__DEV__) console.info("[analytics] track", event, properties ?? {});
  },
  reset: () => {
    const instance = getClient();
    if (instance) {
      instance.reset();
      return;
    }
    if (__DEV__) console.info("[analytics] reset");
  },
};

export const analytics: Analytics = posthogAnalytics;
