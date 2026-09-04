import * as Notifications from "expo-notifications";
import { callApi } from "@/api";
import {
  cancelDailyReminders,
  registerForPushNotifications,
  scheduleDailyReminders,
  syncPushRegistration,
} from "../notifications";

/**
 * Two entry points share one registration body. The distinction between them is
 * the whole point and is easy to erase in a refactor: only the onboarding path
 * may prompt. Asking anywhere else would ambush the user, and iOS shows the
 * system prompt exactly once — burn it in the background and it is gone.
 */

jest.mock("@/api", () => ({ callApi: jest.fn(async () => null) }));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "proj-1" } } }, easConfig: null },
}));

const mockCallApi = callApi as unknown as jest.Mock;
const getPermissions = Notifications.getPermissionsAsync as unknown as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as unknown as jest.Mock;
const getToken = Notifications.getExpoPushTokenAsync as unknown as jest.Mock;

describe("push registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getToken.mockResolvedValue({ data: "ExponentPushToken[abc]" });
  });

  describe("registerForPushNotifications (onboarding — may prompt)", () => {
    it("prompts when permission has not been decided, then registers", async () => {
      getPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
      requestPermissions.mockResolvedValue({ granted: true });

      const token = await registerForPushNotifications(["08:00"]);

      expect(requestPermissions).toHaveBeenCalled();
      expect(token).toBe("ExponentPushToken[abc]");
      expect(mockCallApi).toHaveBeenCalledWith(
        "PUSH_REGISTER",
        expect.objectContaining({
          payload: expect.objectContaining({
            expoPushToken: "ExponentPushToken[abc]",
            notifyTimes: ["08:00"],
          }),
        })
      );
    });

    it("returns null and registers nothing when the user declines", async () => {
      getPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
      requestPermissions.mockResolvedValue({ granted: false });

      expect(await registerForPushNotifications()).toBeNull();
      expect(mockCallApi).not.toHaveBeenCalled();
    });

    it("does not re-prompt once permission is permanently denied", async () => {
      getPermissions.mockResolvedValue({ granted: false, canAskAgain: false });

      expect(await registerForPushNotifications()).toBeNull();
      expect(requestPermissions).not.toHaveBeenCalled();
    });

    it("skips the prompt when permission is already granted", async () => {
      getPermissions.mockResolvedValue({ granted: true, canAskAgain: false });

      await registerForPushNotifications();

      expect(requestPermissions).not.toHaveBeenCalled();
      expect(mockCallApi).toHaveBeenCalled();
    });
  });

  describe("syncPushRegistration (background — must never prompt)", () => {
    it("never prompts, even when the system would allow it", async () => {
      // The guarantee that keeps this safe to run on every foreground.
      getPermissions.mockResolvedValue({ granted: false, canAskAgain: true });

      expect(await syncPushRegistration()).toBeNull();
      expect(requestPermissions).not.toHaveBeenCalled();
      expect(mockCallApi).not.toHaveBeenCalled();
    });

    it("registers silently when permission is already granted", async () => {
      getPermissions.mockResolvedValue({ granted: true, canAskAgain: false });

      const token = await syncPushRegistration(["08:00", "20:00"]);

      expect(token).toBe("ExponentPushToken[abc]");
      expect(mockCallApi).toHaveBeenCalledWith(
        "PUSH_REGISTER",
        expect.objectContaining({
          payload: expect.objectContaining({ notifyTimes: ["08:00", "20:00"] }),
        })
      );
    });

    it("sends an identical payload to the onboarding path", async () => {
      // Both go through one builder; this fails if they are ever forked again.
      getPermissions.mockResolvedValue({ granted: true, canAskAgain: false });

      await registerForPushNotifications(["09:00"]);
      const viaOnboarding = mockCallApi.mock.calls[0][1];
      mockCallApi.mockClear();

      await syncPushRegistration(["09:00"]);
      const viaSync = mockCallApi.mock.calls[0][1];

      expect(viaSync).toEqual(viaOnboarding);
    });
  });
});

const schedule = Notifications.scheduleNotificationAsync as unknown as jest.Mock;
const cancelOne = Notifications.cancelScheduledNotificationAsync as unknown as jest.Mock;
const getAllScheduled = Notifications.getAllScheduledNotificationsAsync as unknown as jest.Mock;

/**
 * The local schedule is the half that actually delivers today, and every one of
 * its failure modes is silent — the symptom is "reminders stopped" weeks later.
 */
describe("local daily reminders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllScheduled.mockResolvedValue([]);
  });

  it("arms one repeating daily trigger per time", async () => {
    getPermissions.mockResolvedValue({ granted: true });

    const armed = await scheduleDailyReminders(["08:00", "20:30:00"]);

    expect(armed).toBe(2);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule.mock.calls[0][0].trigger).toEqual(
      expect.objectContaining({ type: "daily", hour: 8, minute: 0 })
    );
    // `HH:mm:ss` is as valid in the profile as `HH:mm`.
    expect(schedule.mock.calls[1][0].trigger).toEqual(
      expect.objectContaining({ type: "daily", hour: 20, minute: 30 })
    );
  });

  it("routes a tap to the log tab", async () => {
    getPermissions.mockResolvedValue({ granted: true });

    await scheduleDailyReminders(["08:00"]);

    expect(schedule.mock.calls[0][0].content.data).toEqual(
      expect.objectContaining({ screen: "log" })
    );
  });

  it("replaces the previous schedule rather than stacking onto it", async () => {
    // Re-arming runs on every foreground, so a non-idempotent version would
    // multiply the user's reminders every time they opened the app.
    getPermissions.mockResolvedValue({ granted: true });
    getAllScheduled.mockResolvedValue([
      { identifier: "old-1", content: { data: { kind: "food-log-reminder" } } },
      { identifier: "someone-elses", content: { data: { kind: "other" } } },
    ]);

    await scheduleDailyReminders(["09:00"]);

    expect(cancelOne).toHaveBeenCalledWith("old-1");
    expect(cancelOne).not.toHaveBeenCalledWith("someone-elses");
  });

  it("clears the schedule when permission has been revoked", async () => {
    // Permission can be withdrawn in OS settings long after the times were set;
    // leaving a schedule armed that can never be delivered hides the breakage.
    getPermissions.mockResolvedValue({ granted: false });
    getAllScheduled.mockResolvedValue([
      { identifier: "old-1", content: { data: { kind: "food-log-reminder" } } },
    ]);

    const armed = await scheduleDailyReminders(["08:00"]);

    expect(armed).toBe(0);
    expect(schedule).not.toHaveBeenCalled();
    expect(cancelOne).toHaveBeenCalledWith("old-1");
  });

  it("arms nothing for empty or malformed times", async () => {
    getPermissions.mockResolvedValue({ granted: true });

    expect(await scheduleDailyReminders([])).toBe(0);
    expect(await scheduleDailyReminders(null)).toBe(0);
    expect(await scheduleDailyReminders(["25:00", "nonsense"])).toBe(0);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("caps at the three slots the contract allows", async () => {
    getPermissions.mockResolvedValue({ granted: true });

    expect(await scheduleDailyReminders(["07:00", "12:00", "18:00", "22:00"])).toBe(3);
  });

  it("cancels only its own notifications on sign-out", async () => {
    getAllScheduled.mockResolvedValue([
      { identifier: "mine", content: { data: { kind: "food-log-reminder" } } },
      { identifier: "theirs", content: { data: {} } },
    ]);

    await cancelDailyReminders();

    expect(cancelOne).toHaveBeenCalledWith("mine");
    expect(cancelOne).toHaveBeenCalledTimes(1);
  });
});
