import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PersonalInfoScreen } from "../screens/PersonalInfoScreen";

const mockUseMe = jest.fn();
const mockUseSettings = jest.fn();
const mockUpdateSettingsMutate = jest.fn();
const mockUseSubscription = jest.fn();
const mockLogoutMutate = jest.fn();
const mockUpdateProfileMutate = jest.fn();
const mockAvatarUploadMutate = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
  }),
  useAvatarUpload: () => ({
    mutate: mockAvatarUploadMutate,
    isPending: false,
  }),
  FileTooLargeError: class FileTooLargeError extends Error {},
  formatBytes: (bytes: number) => `${bytes} B`,
}));

jest.mock("@/features/subscription", () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useLogout: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

jest.mock("../hooks/useSettings", () => ({
  useSettings: () => mockUseSettings(),
}));

jest.mock("../hooks/useUpdateSettings", () => ({
  useUpdateSettings: () => ({
    mutate: mockUpdateSettingsMutate,
    isPending: false,
  }),
}));

const profile = {
  id: "user-1",
  email: "alex@email.com",
  name: "Alex Johnson",
  goal: "lose",
  sex: "female",
  age: 32,
  heightCm: "156.0",
  weightKg: "92.0",
  targetWeightKg: "76.0",
  tdeeKcal: 2000,
  dailyTargetKcal: 1600,
  targetProteinG: 120,
  targetCarbsG: 160,
  targetFatG: 50,
  activityLevel: "light",
  manualDailyTargetKcal: null,
  notifyTimes: null,
  timezone: "Africa/Lagos",
  tier: "premium",
  accountStatus: "paid",
  trialEndsAt: null,
  onboardingStep: 7,
  isOnboarded: true,
  isOnboardingSkipped: false,
  createdAt: "2026-06-01T00:00:00.000Z",
};

const settings = {
  id: "settings-1",
  userId: "user-1",
  unitSystem: "metric",
  pushNotificationsEnabled: true,
  dailyFoodLogReminderEnabled: true,
  dailyFoodLogReminderTime: "08:00",
  weightCheckReminderEnabled: true,
  weightCheckReminderDay: "friday",
  weightCheckReminderTime: "09:00",
  hydrationReminderEnabled: true,
  hydrationReminderIntervalMinutes: 40,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const subscription = {
  subscription: {
    entitlement: "premium",
    status: "active",
    plan: "monthly",
    productId: "thrivo_premium_monthly",
    priceLabel: "$14.99",
    renewsAt: "2026-07-16T00:00:00.000Z",
    accessEndsAt: "2026-07-16T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    trialUsed: true,
    trialDays: 14,
    plans: [],
  },
};

describe("settings screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMe.mockReturnValue({ data: profile, isLoading: false });
    mockUseSettings.mockReturnValue({ data: settings, isLoading: false });
    mockUseSubscription.mockReturnValue({ data: subscription, isLoading: false });
  });

  it("renders the settings sections and routes to profile edit", () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("Subscription")).toBeTruthy();
    expect(screen.getByText("Legal")).toBeTruthy();

    fireEvent.press(screen.getByText("Alex Johnson"));

    expect(router.push).toHaveBeenCalledWith("/(app)/settings/personal-info");
  });

  it("persists unit and notification setting changes", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("kg / cm"));
    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ unitSystem: "imperial" });

    fireEvent.press(screen.getByText("Every 40 mins"));
    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({
      hydrationReminderIntervalMinutes: 60,
    });
  });

  it("signs out through the auth hook", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Sign out"));

    expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
  });

  it("saves personal information through the profile hook", () => {
    const screen = render(<PersonalInfoScreen />);

    fireEvent.changeText(screen.getByDisplayValue("Alex Johnson"), "Alexandra Johnson");
    fireEvent.press(screen.getByText("Save changes"));

    expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Alexandra Johnson",
        goal: "lose",
        sex: "female",
        currentWeightKg: 92,
        targetWeightKg: 76,
        heightCm: 156,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
