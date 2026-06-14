import * as SecureStore from "expo-secure-store";

/**
 * Secure storage for secrets only — the auth token (MOBILE_ARCHITECTURE §8).
 * Nothing sensitive ever goes to AsyncStorage or logs. This module is the
 * source of truth for the token; the session store holds an in-memory mirror.
 */
const TOKEN_KEY = "thrivo.auth.token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
