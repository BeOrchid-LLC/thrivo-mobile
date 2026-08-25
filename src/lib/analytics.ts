import PostHog from "posthog-react-native";
import { env } from "@/config/env";

/**
 * Product analytics (PostHog — supersedes the Mixpanel seam in ADR-0010 for its
 * first-class Expo support; the funnel and event names are unchanged). The
 * `Analytics` interface is the seam feature code calls; the implementation is the
 * real PostHog client when `EXPO_PUBLIC_POSTHOG_KEY` is set, and a no-op (dev
 * console) otherwise. A production build without a key never reaches here — `env`
 * throws at bootstrap (fail fast).
 *
 * Event names follow the platform-wide `thrivo.<object>_<action>` convention and
 * are fixed by the Remaining Scope PRD — see docs/naming-conventions-plan.md.
 * This union is the enforcement point: keep it closed so a new event cannot be
 * introduced under a different format.
 */
export type AnalyticsEvent =
  | "thrivo.signup"
  | "thrivo.onboarding_completed"
  | "thrivo.food_logged"
  | "thrivo.custom_food_created"
  | "thrivo.log_copied"
  | "thrivo.barcode_scanned"
  | "thrivo.paywall_viewed"
  | "thrivo.upgrade_prompt_shown"
  | "thrivo.trial_started"
  | "thrivo.subscription_started"
  | "thrivo.subscription_management_opened"
  | "thrivo.reminder_set"
  | "thrivo.checkin_submitted";

export interface Analytics {
  init: () => void;
  identify: (userId: string) => void;
  track: (event: AnalyticsEvent, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

let client: PostHog | null = null;
let signupPending = false;

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
      if (signupPending) {
        instance.capture("thrivo.signup", { method: "email_code" });
        signupPending = false;
      }
      return;
    }
    if (__DEV__) console.info("[analytics] identify", userId);
    signupPending = false;
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
    signupPending = false;
    const instance = getClient();
    if (instance) {
      instance.reset();
      return;
    }
    if (__DEV__) console.info("[analytics] reset");
  },
};

export function queueSignup(): void {
  signupPending = true;
}

export const analytics: Analytics = posthogAnalytics;
