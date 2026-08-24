import * as Notifications from "expo-notifications";
import { callApi } from "@/api";
import { registerForPushNotifications, syncPushRegistration } from "../notifications";

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
