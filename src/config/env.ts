import { z } from "zod";

/**
 * Runtime-validated public config. `EXPO_PUBLIC_*` vars are inlined into the JS
 * bundle at build time — never put secrets here (MOBILE_ARCHITECTURE §11).
 * Validation fails fast at import so a misconfigured build surfaces immediately.
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = {
  apiUrl: parsed.data.EXPO_PUBLIC_API_URL,
  /** Versioned API prefix applied by the API client. */
  apiPrefix: "/api/v1",
} as const;

export type Env = typeof env;
