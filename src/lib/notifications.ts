import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { callApi } from "@/api";
import { monitoring } from "./monitoring";

/**
 * Push notifications adapter (Expo Notifications — MOBILE_ARCHITECTURE §8).
 * Permission is requested after login; denial degrades gracefully (in-app
 * reminder only). The Expo token is registered with the backend so it can send
 * the daily nudge; tapping a nudge routes to the check-in screen.
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

/** Request permission, fetch the Expo token and register it with the backend. */
export async function registerForPushNotifications(notifyTimes?: string[]): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null; // graceful denial — caller falls back to in-app

    const projectId = resolveProjectId();
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await callApi("PUSH_REGISTER", {
      payload: {
        expoPushToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
        notifyTimes,
      },
    });

    return expoPushToken;
  } catch (error) {
    monitoring.captureException(error, { scope: "registerForPushNotifications" });
    return null;
  }
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
