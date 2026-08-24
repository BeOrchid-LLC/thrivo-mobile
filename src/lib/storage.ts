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
  deviceHasOpened: "thrivo.device.hasOpened",
  offlineBarcodeScans: "thrivo.food.offlineBarcodeScans",
  favorites: "thrivo.favorites",
  onboardingDraft: "thrivo.onboarding-draft",
  preferences: "thrivo.preferences",
} as const;

/**
 * Keys holding data that belongs to the signed-in person rather than the device.
 *
 * `deviceHasOpened` is deliberately excluded — it records that *this handset* has
 * run the app before, which stays true no matter who is signed in.
 *
 * The last three are Zustand stores that persist themselves under their own
 * keys — favourited foods, the first name and goal in the onboarding draft, the
 * biometric preference. Nothing else in the app touches them, which is exactly
 * why they were missed until now.
 */
const USER_SCOPED_KEYS: string[] = [
  storageKeys.notifyAt,
  storageKeys.unitSystem,
  storageKeys.biometricAuthEnabled,
  storageKeys.offlineBarcodeScans,
  storageKeys.favorites,
  storageKeys.onboardingDraft,
  storageKeys.preferences,
];

/**
 * Wipes everything on this device belonging to the signed-in user.
 *
 * Account deletion promises the data is gone; leaving preferences behind makes
 * that untrue, and leaving `offlineBarcodeScans` behind is worse than untidy —
 * a scan queued by the deleted account would replay into whichever account signs
 * in next, writing one person's food into another person's log.
 */
export async function clearUserScopedStorage(): Promise<void> {
  // The offline barcode queue is namespaced per user, so match on the prefix
  // rather than a fixed key — otherwise the deleted account's queue survives.
  const all = await AsyncStorage.getAllKeys();
  const queues = all.filter((key) => key.startsWith(storageKeys.offlineBarcodeScans));
  await AsyncStorage.multiRemove([...USER_SCOPED_KEYS, ...queues]);
}
