import { z } from "zod";

/**
 * Runtime-validated public config. `EXPO_PUBLIC_*` vars are inlined into the JS
 * bundle at build time — never put secrets here (MOBILE_ARCHITECTURE §11).
 * Validation fails fast at import so a misconfigured build surfaces immediately.
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
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
  /** Versioned API prefix applied by the API client. */
  apiPrefix: "/api/v1",
} as const;

export type Env = typeof env;
