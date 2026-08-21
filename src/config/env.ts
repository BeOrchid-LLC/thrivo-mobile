import { Platform } from "react-native";
import { z } from "zod";

/**
 * Runtime-validated public config. `EXPO_PUBLIC_*` vars are inlined into the JS
 * bundle at build time — never put secrets here (MOBILE_ARCHITECTURE §11).
 * The API URL defaults to production so store/preview builds do not crash when
 * the local `.env` file is absent in EAS.
 *
 * Policy (ADR — fail fast): feature vars are optional in development but
 * **required in a production build** — a release bundle without crash reporting
 * or analytics configured throws at bootstrap rather than shipping blind.
 */
const DEFAULT_API_URL = "https://api.thrivo.fit";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

// `__DEV__` is a RN/Metro global (true in dev + Jest, false in release bundles).
// Fall back to NODE_ENV for any non-RN evaluation context.
const isProductionBuild =
  typeof __DEV__ !== "undefined" ? !__DEV__ : process.env.NODE_ENV === "production";

const envSchema = z
  .object({
    EXPO_PUBLIC_API_URL: z.string().url(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Native Google Sign-In (Clerk `@clerk/expo/google`). Optional: when unset the
    // Google button is hidden rather than crashing at flow start. The web client ID
    // is required on both platforms; the iOS client ID is additionally required on
    // iOS. (The iOS URL scheme is a build-time-only var consumed by the config
    // plugin — not validated here.)
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
    // Apple sign-in has no client-side credential (Clerk handles it via the iOS
    // entitlement), so its button is gated by an explicit feature flag rather than
    // a credential. Default OFF: only the literal string "true" shows the button.
    EXPO_PUBLIC_APPLE_AUTH_ENABLED: z.string().optional(),
    // Observability (Sentry crash reporting + PostHog product analytics).
    EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    EXPO_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_POSTHOG_HOST: z.string().url().default(DEFAULT_POSTHOG_HOST),
    // In-app purchases (RevenueCat). Public SDK keys — one per store, safe to
    // ship in the bundle. Absent in development, where billing runs as a no-op.
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().min(1).optional(),
  })
  .superRefine((parsed, ctx) => {
    if (!isProductionBuild) return;
    // A production build must ship observability configured — fail fast.
    if (!parsed.EXPO_PUBLIC_SENTRY_DSN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EXPO_PUBLIC_SENTRY_DSN"],
        message: "Required in production builds (crash reporting).",
      });
    }
    if (!parsed.EXPO_PUBLIC_POSTHOG_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EXPO_PUBLIC_POSTHOG_KEY"],
        message: "Required in production builds (product analytics).",
      });
    }
    // Only the running platform's key matters — an iOS release does not need the
    // Play key to be present. A release build that shipped without its own key
    // would show an empty paywall and take no payment, so fail fast instead.
    const billingKeyPath =
      Platform.OS === "android"
        ? ("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY" as const)
        : ("EXPO_PUBLIC_REVENUECAT_IOS_KEY" as const);
    if (!parsed[billingKeyPath]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [billingKeyPath],
        message: "Required in production builds (in-app purchases).",
      });
    }
  });

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
  EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
  EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
  EXPO_PUBLIC_APPLE_AUTH_ENABLED:
    process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED?.trim().toLowerCase() || undefined,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || undefined,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() || undefined,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || undefined,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = {
  apiUrl: parsed.data.EXPO_PUBLIC_API_URL,
  clerkPublishableKey: parsed.data.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  googleWebClientId: parsed.data.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
  googleIosClientId: parsed.data.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID,
  /** Feature flag (default off): shows the Apple sign-in button only when "true". */
  appleAuthEnabled: parsed.data.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true",
  sentryDsn: parsed.data.EXPO_PUBLIC_SENTRY_DSN,
  posthogKey: parsed.data.EXPO_PUBLIC_POSTHOG_KEY,
  posthogHost: parsed.data.EXPO_PUBLIC_POSTHOG_HOST,
  /** RevenueCat SDK key for the running platform — undefined disables billing. */
  revenueCatKey:
    Platform.OS === "android"
      ? parsed.data.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : parsed.data.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  /** True in release bundles — gates dev-only logging and prod-only requirements. */
  isProduction: isProductionBuild,
  /** Versioned API prefix applied by the API client. */
  apiPrefix: "/api/v1",
} as const;

export type Env = typeof env;
