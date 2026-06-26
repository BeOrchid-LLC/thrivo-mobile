import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Typed wrapper over AsyncStorage for NON-sensitive data — preferences, flags,
 * cached non-secret values (MOBILE_ARCHITECTURE §8). Never store secrets here;
 * use secure-store for those.
 */
export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt/legacy value — treat as absent rather than throwing.
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Namespaced preference keys live here to avoid collisions. */
export const storageKeys = {
  notifyAt: "thrivo.pref.notifyAt",
  unitSystem: "thrivo.pref.unitSystem",
  biometricAuthEnabled: "thrivo.pref.biometricAuthEnabled",
} as const;
