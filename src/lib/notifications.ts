import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import type * as NotificationsModule from "expo-notifications";
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
 *
 * **Expo Go is unsupported on purpose.** SDK 53 removed Android remote push from
 * Expo Go, and merely *importing* `expo-notifications` there logs a red error at
 * module load. So the module is `require`d lazily and only outside Expo Go —
 * every entry point below then no-ops (returns null / a noop unsubscribe) rather
 * than throwing. Use a development build to exercise push for real; see
 * docs/eas-builds-and-updates.md.
 */

/** `appOwnership === "expo"` is the SDK 53+ signal; `executionEnvironment` covers older shapes. */
const isExpoGo =
  (Constants.appOwnership as string | null) === "expo" ||
  (Constants.executionEnvironment as string | undefined) === "storeClient";

let cached: typeof NotificationsModule | null = null;

/** The single gate: `null` means "no push on this runtime", never an error. */
function getNotifications(): typeof NotificationsModule | null {
  if (isExpoGo) return null;
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as typeof NotificationsModule;
    cached.setNotificationHandler({
      handleNotification: async () => ({
        // SDK 54 replaced the single `shouldShowAlert` with the granular
        // banner/list pair (iOS 14+ presentation options).
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  return cached;
}

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/**
 * Fetch the Expo token and hand it to the backend.
 *
 * The only place the registration payload is built. Both entry points below go
 * through here so they cannot drift — they differ solely in whether they are
 * allowed to prompt.
 */
async function registerToken(
  Notifications: typeof NotificationsModule,
  notifyTimes?: string[]
): Promise<string> {
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
 * Request permission, then register. **The only path allowed to prompt** — call
 * it from the onboarding step where the user has agreed to be asked.
 *
 * Returns null when permission is denied (graceful degradation) or when push is
 * unavailable on this runtime. Throws for any other failure so the caller can
 * surface feedback.
 */
export async function registerForPushNotifications(notifyTimes?: string[]): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null; // Expo Go — no push, no crash

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null; // permission denied — caller degrades gracefully

  return registerToken(Notifications, notifyTimes);
}

/**
 * Re-registers the push token **without ever prompting**.
 *
 * Registration used to happen only once, inside onboarding. Two things break
 * that: Expo push tokens can rotate (reinstall, restore from backup, OS-level
 * changes), and a user who skipped onboarding — or who granted permission later
 * in iOS Settings — never registered at all. In both cases the backend holds a
 * dead token or none, and reminders stop arriving with nothing to show for it.
 *
 * Returns the token, or null when permission is not granted. Deliberately never
 * calls `requestPermissionsAsync`: asking outside the onboarding step the user
 * agreed to would be an ambush, and iOS only ever shows the prompt once anyway.
 */
export async function syncPushRegistration(notifyTimes?: string[]): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return null;

  return registerToken(Notifications, notifyTimes);
}

/** Permission snapshot, in the shape screens need. */
export interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Read the notification permission without prompting. In Expo Go it reports
 * `canAskAgain: false` — there is nothing to grant, so UI should offer the
 * fallback rather than a button that cannot work.
 */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  const Notifications = getNotifications();
  if (!Notifications) return { granted: false, canAskAgain: false };

  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  return { granted, canAskAgain };
}

/** Prompt for the notification permission. No-ops (denied) where push is unavailable. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const Notifications = getNotifications();
  if (!Notifications) return { granted: false, canAskAgain: false };

  const { granted, canAskAgain } = await Notifications.requestPermissionsAsync();
  return { granted, canAskAgain };
}

const noop = () => {};

/**
 * Subscribe to push-token rotation. Returns an unsubscribe fn. Without this a
 * rotated token is never re-registered and the device silently stops receiving
 * anything.
 */
export function addPushTokenChangeListener(handler: () => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return noop;

  const subscription = Notifications.addPushTokenListener(() => handler());
  return () => subscription.remove();
}

/**
 * Subscribe to notification taps. Returns an unsubscribe fn. The handler receives
 * the notification's `data` so navigation can route (e.g. to the check-in screen).
 */
export function addNotificationResponseListener(
  handler: (data: Record<string, unknown>) => void
): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return noop;

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}
