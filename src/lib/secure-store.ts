import * as SecureStore from "expo-secure-store";

/**
 * Secure storage for secrets only — the access + refresh tokens
 * (MOBILE_ARCHITECTURE §8). Nothing sensitive ever goes to AsyncStorage or logs.
 * This module is the source of truth for the tokens; the session store holds an
 * in-memory mirror of the access token only.
 */
const TOKEN_KEY = "thrivo.auth.token";
const REFRESH_KEY = "thrivo.auth.refresh";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

/** Persist a freshly-issued access + refresh pair together. */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([setToken(accessToken), setRefreshToken(refreshToken)]);
}

/** Drop both tokens (logout / hard 401). */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
