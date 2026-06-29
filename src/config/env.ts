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
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),
    // Observability (Sentry crash reporting + PostHog product analytics).
    EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    EXPO_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_POSTHOG_HOST: z.string().url().default(DEFAULT_POSTHOG_HOST),
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
  });

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || undefined,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = {
  apiUrl: parsed.data.EXPO_PUBLIC_API_URL,
  googleWebClientId: parsed.data.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleIosClientId: parsed.data.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  googleAndroidClientId: parsed.data.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  sentryDsn: parsed.data.EXPO_PUBLIC_SENTRY_DSN,
  posthogKey: parsed.data.EXPO_PUBLIC_POSTHOG_KEY,
  posthogHost: parsed.data.EXPO_PUBLIC_POSTHOG_HOST,
  /** True in release bundles — gates dev-only logging and prod-only requirements. */
  isProduction: isProductionBuild,
  /** Versioned API prefix applied by the API client. */
  apiPrefix: "/api/v1",
} as const;

export type Env = typeof env;
