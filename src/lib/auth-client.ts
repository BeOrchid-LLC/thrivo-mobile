import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { env } from "@/config/env";

/**
 * BetterAuth client — used ONLY for the Google social sign-in redirect flow. The
 * `@better-auth/expo` plugin opens the system browser, handles the `thrivo://`
 * deep-link return, and stores the session. The rest of the app keeps its own
 * bearer-token session system (secure-store + `callApi`); `useGoogleSignIn`
 * bridges the resulting token into it, so this client is not a second source of
 * truth for app requests.
 *
 * `expo-secure-store` exposes synchronous `getItem`/`setItem` (SDK 54), which is
 * the storage shape the Expo plugin expects.
 */
export const authClient = createAuthClient({
  baseURL: `${env.apiUrl}${env.apiPrefix}/auth`,
  plugins: [
    expoClient({
      scheme: "thrivo",
      storagePrefix: "thrivo",
      storage: SecureStore,
    }),
  ],
});
