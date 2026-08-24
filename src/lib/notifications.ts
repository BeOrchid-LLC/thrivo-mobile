import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { callApi } from "@/api";

const PUSH_DEVICE_ID_KEY = "thrivo.push.device-id";

async function resolvePushDeviceId(): Promise<string> {
  const platformId =
    Platform.OS === "android"
      ? Application.getAndroidId()
      : Platform.OS === "ios"
        ? await Application.getIosIdForVendorAsync()
        : null;
  if (platformId) return `${Platform.OS}:${platformId}`;

  const stored = await SecureStore.getItemAsync(PUSH_DEVICE_ID_KEY);
  if (stored) return stored;

  const generated = `${Platform.OS}:${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(PUSH_DEVICE_ID_KEY, generated);
  return generated;
}

/**
 * Push notifications adapter (Expo Notifications — MOBILE_ARCHITECTURE §8).
 * Permission is requested after login; denial degrades gracefully (in-app
 * reminder only). The Expo token is registered with the backend so it can send
 * scheduled food-log reminders and psychology tips. Food-log taps route to
 * logging; psychology-tip taps route to check-in.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 54 replaced the single `shouldShowAlert` with the granular
    // banner/list pair (iOS 14+ presentation options).
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Request permission, fetch the Expo push token and register it with the
 * backend. Returns null when the user denies permission (graceful degradation).
 * Throws for any other failure (token fetch error, backend error) so callers
 * can surface feedback to the user.
 */
export async function registerForPushNotifications(notifyTimes?: string[]): Promise<string | null> {
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null; // permission denied — caller degrades gracefully

  const projectId = resolveProjectId();
  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const deviceId = await resolvePushDeviceId();

  await callApi("PUSH_REGISTER", {
    payload: {
      expoPushToken,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceId,
      notifyTimes,
    },
  });

  return expoPushToken;
}

/**
 * Subscribe to notification taps. Returns an unsubscribe fn. The handler receives
 * the notification's `data` so navigation can route (e.g. to the check-in screen).
 */
export function addNotificationResponseListener(
  handler: (data: Record<string, unknown>) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}
