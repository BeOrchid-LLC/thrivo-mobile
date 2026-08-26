import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/expo";

/**
 * Clerk's token store, backed by the Keychain / Android Keystore.
 *
 * Every method swallows its failure. Android's SecureStore rejects any value
 * over 2048 bytes, and a session JWT with enough claims crosses that — an
 * unguarded `saveToken` rejection propagates out of Clerk's `getToken()`, which
 * `callApi` awaits while building the request, so the API client reads it as a
 * network failure and the session-restore screen shows "Could not restore your
 * session" on a perfectly good login. Degrading to Clerk's in-memory token for
 * this launch is strictly better: the user stays signed in, and only the
 * across-restarts persistence is lost.
 */
const memoryFallback = new Map<string, string>();

export const clerkTokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return (await SecureStore.getItemAsync(key)) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  async saveToken(key: string, value: string) {
    memoryFallback.set(key, value);
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Persisted copy unavailable (oversized value / keystore failure) — the
      // in-memory copy above keeps this session working.
    }
  },
  async clearToken(key: string) {
    memoryFallback.delete(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing to clear, or the keystore is unavailable; the in-memory copy is
      // already gone, which is what sign-out actually depends on.
    }
  },
};
