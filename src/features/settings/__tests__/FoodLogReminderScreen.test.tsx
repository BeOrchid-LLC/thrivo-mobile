import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { FoodLogReminderScreen } from "../screens/FoodLogReminderScreen";

const mockUseMe = jest.fn();
const mockUseSettings = jest.fn();
const mockUpdateProfileAsync = jest.fn();
const mockTrack = jest.fn();
const mockRegister = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
  useUpdateProfile: () => ({ mutateAsync: mockUpdateProfileAsync, isPending: false }),
}));

jest.mock("@/lib", () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
  monitoring: { captureException: jest.fn() },
  requestNotificationPermission: (...args: unknown[]) => mockRequestPermission(...args),
  scheduleDailyReminders: (...args: unknown[]) => mockScheduleReminders(...args),
  syncPushRegistration: (...args: unknown[]) => mockRegister(...args),
}));

const mockRequestPermission = jest.fn();
const mockScheduleReminders = jest.fn();

jest.mock("../hooks/useSettings", () => ({
  useSettings: () => mockUseSettings(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMe.mockReturnValue({
    data: { notifyTimes: ["09:15:00", "13:00:00"], timezone: "Africa/Lagos" },
    isLoading: false,
  });
  mockUseSettings.mockReturnValue({ data: { dailyFoodLogReminderTime: "08:00" } });
  mockUpdateProfileAsync.mockResolvedValue(undefined);
  mockRegister.mockResolvedValue("token");
  mockRequestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
  mockScheduleReminders.mockResolvedValue(2);
});

describe("FoodLogReminderScreen", () => {
  it("seeds the picker from the saved schedule", () => {
    const screen = render(<FoodLogReminderScreen />);

    expect(screen.getByText("9:15 AM")).toBeTruthy();
    expect(screen.getByText("1:00 PM")).toBeTruthy();
    // Two slots saved, so the third stays out of the list.
    expect(screen.queryByText("Evening")).toBeNull();
  });

  it("saves the schedule, registers for push, and reports it once", async () => {
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() =>
      expect(mockUpdateProfileAsync).toHaveBeenCalledWith({
        notifyTimes: ["09:15", "13:00"],
        timezone: "Africa/Lagos",
      })
    );
    expect(mockRegister).toHaveBeenCalledWith(["09:15", "13:00"]);
    // The device-local schedule is what actually delivers the reminder.
    expect(mockScheduleReminders).toHaveBeenCalledWith(["09:15", "13:00"]);
    expect(mockTrack).toHaveBeenCalledWith("thrivo.reminder_set", {
      reminder: "notifyTimes",
      count: 2,
    });
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("leaves for the settings list even when the token cannot be registered", async () => {
    // The iOS Simulator has no APNs, and Android has no FCM credentials yet, so
    // this call fails on every device we test on. It used to strand the user on
    // "push notifications couldn't be enabled" over reminders that were armed.
    mockRegister.mockRejectedValue(new Error("no push credentials"));
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() => expect(mockScheduleReminders).toHaveBeenCalled());
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(screen.queryByText(/couldn't switch reminders on/)).toBeNull();
  });

  it("arms nothing when notification permission is refused", async () => {
    mockRequestPermission.mockResolvedValue({ granted: false, canAskAgain: false });
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockScheduleReminders).not.toHaveBeenCalled();
  });

  it("keeps the user on the page when the save fails", async () => {
    mockUpdateProfileAsync.mockRejectedValue(new Error("offline"));
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("Enable notifications"));

    expect(await screen.findByText(/couldn't save your reminder times/)).toBeTruthy();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("adds a slot when the count goes up, without touching the saved ones", async () => {
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("3"));
    expect(screen.getByText("Evening")).toBeTruthy();

    fireEvent.press(screen.getByText("Enable notifications"));
    await waitFor(() =>
      expect(mockUpdateProfileAsync).toHaveBeenCalledWith(
        expect.objectContaining({ notifyTimes: ["09:15", "13:00", "20:00"] })
      )
    );
  });

  it("leaves without saving on skip", () => {
    const screen = render(<FoodLogReminderScreen />);

    fireEvent.press(screen.getByText("Skip for now"));

    expect(mockUpdateProfileAsync).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });
});
