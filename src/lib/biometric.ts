import * as LocalAuthentication from "expo-local-authentication";

/**
 * Device-local biometric auth (Face ID / Touch ID / fingerprint). This is a
 * device setting only — the enabled flag lives in AsyncStorage (preferences
 * store) and is **never** sent to the backend (MOBILE_ARCHITECTURE §8). This
 * wrapper isolates the native boundary so it can be mocked in tests.
 */

/** True only when the device has biometric hardware AND an enrolled credential. */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/**
 * Prompt for a biometric (with device-passcode fallback). Returns true only on a
 * successful match. Never throws — a thrown native error resolves to false so the
 * caller can keep the app locked rather than failing open.
 */
export async function authenticateBiometric(promptMessage = "Unlock Thrivo"): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // Allow the device passcode so a failed/again-unavailable sensor isn't a lockout.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
