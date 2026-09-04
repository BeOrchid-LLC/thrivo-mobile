import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PersonalInfoScreen } from "../screens/PersonalInfoScreen";

const mockUseMe = jest.fn();
const mockUseSettings = jest.fn();
const mockUpdateSettingsMutate = jest.fn();
const mockUseSubscription = jest.fn();
const mockLogoutMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockUpdateProfileMutate = jest.fn();
const mockAvatarUploadMutate = jest.fn();

const mockTrack = jest.fn();

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
  useOfferings: () => ({ data: undefined }),
  productForPlan: () => undefined,
}));

jest.mock("@/features/subscription/hooks/useCancelSubscription", () => ({
  useCancelSubscription: () => ({ mutate: mockCancelMutate, isPending: false }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useLogout: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

jest.mock("@/lib", () => ({
  analytics: { track: (...a: unknown[]) => mockTrack(...a) },
  isBillingConfigured: () => false,
}));

// Render the picker as a pressable stand-in so the real onTimePicked handler in
// SettingsScreen can be driven, rather than asserting against a copy of it.
jest.mock("@/components/TimePicker", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    TimePicker: ({ onChange }: { onChange: (e: unknown, d?: Date) => void }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange({ type: "set" }, new Date(2026, 0, 1, 8, 30))}
      >
        <Text>confirm-time</Text>
      </Pressable>
    ),
  };
});

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

const profileWithImage = {
  ...profile,
  image: "https://example.com/avatar.jpg",
};

const settings = {
  id: "settings-1",
  userId: "user-1",
  unitSystem: "metric",
  pushNotificationsEnabled: true,
  dailyFoodLogReminderEnabled: true,
  psychologyTipPushEnabled: true,
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

    expect(router.push).toHaveBeenCalledWith("/(app)/personal-info");
  });

  it("shows the profile image in settings when one is saved", () => {
    mockUseMe.mockReturnValue({ data: profileWithImage, isLoading: false });

    const screen = render(<SettingsScreen />);

    expect(screen.getByLabelText("Profile photo")).toBeTruthy();
    expect(screen.queryByText("AJ")).toBeNull();
  });

  /**
   * The subscription card is the only place in the app that states what the next
   * charge is and when. Getting it wrong — naming a charge for a subscription
   * that will not renew, or a date that is really when access stops — is the
   * kind of error people notice on their bank statement.
   */
  it("states the plan, the next charge and its date", () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Thrivo monthly")).toBeTruthy();
    expect(screen.getByText("Active - Renews Jul. 16")).toBeTruthy();
    expect(screen.getByText("Next charge")).toBeTruthy();
    expect(screen.getByText("$14.99 on Jul. 16")).toBeTruthy();
  });

  it("names no next charge for a subscription that will not renew", () => {
    mockUseSubscription.mockReturnValue({
      data: {
        subscription: {
          ...subscription.subscription,
          status: "canceled",
          cancelAtPeriodEnd: true,
          renewsAt: null,
        },
      },
      isLoading: false,
    });

    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Access until Jul. 16")).toBeTruthy();
    expect(screen.queryByText("Next charge")).toBeNull();
    expect(screen.queryByText("Cancel subscription")).toBeNull();
  });

  it("confirms before cancelling, and only says it is done once it is", () => {
    mockCancelMutate.mockImplementation((_payload, options) =>
      options?.onSuccess?.({ openedStore: false })
    );
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Cancel subscription"));
    expect(screen.getByText("Cancel your subscription?")).toBeTruthy();
    expect(screen.queryByText("Subscription cancelled")).toBeNull();

    fireEvent.press(screen.getByText("Cancel my subscription"));

    expect(mockCancelMutate).toHaveBeenCalled();
    expect(screen.getByText("Subscription cancelled")).toBeTruthy();
    expect(
      screen.getByText("Confirmation sent to alex@email.com. Access continues until July 16, 2026.")
    ).toBeTruthy();
  });

  it("keeps premium when the confirmation is declined", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Cancel subscription"));
    fireEvent.press(screen.getByText("Keep premium"));

    expect(mockCancelMutate).not.toHaveBeenCalled();
    expect(screen.queryByText("Cancel your subscription?")).toBeNull();
  });

  it("persists unit and notification setting changes from select sheets", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("kg / cm"));
    expect(screen.getByText("Metric (kg / cm)")).toBeTruthy();
    fireEvent.press(screen.getByText("Imperial (lb / in)"));
    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ unitSystem: "imperial" });

    fireEvent.press(screen.getByText("Every 40 mins"));
    expect(screen.getByText("Hydration interval")).toBeTruthy();
    expect(screen.getByText("Every 120 mins")).toBeTruthy();
    fireEvent.press(screen.getByText("Every 60 mins"));
    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({
      hydrationReminderIntervalMinutes: 60,
    });
  });

  it("toggles psychology-tip push delivery separately", () => {
    const screen = render(<SettingsScreen />);

    fireEvent(screen.getByLabelText("Psychology tips"), "valueChange", false);

    expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ psychologyTipPushEnabled: false });
  });

  it("signs out through the auth hook", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Sign out"));

    expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
  });

  it("saves personal information through the profile hook", () => {
    const screen = render(<PersonalInfoScreen />);

    fireEvent.changeText(screen.getByDisplayValue("Alex Johnson"), "Alexandra Johnson");
    fireEvent.press(screen.getByLabelText("Select goal"));
    expect(screen.getByText("Build muscle")).toBeTruthy();
    fireEvent.press(screen.getByText("Build muscle"));
    fireEvent.press(screen.getByLabelText("Select sex"));
    fireEvent.press(screen.getByText("Prefer not to say"));
    fireEvent.press(screen.getByText("Save changes"));

    expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Alexandra Johnson",
        goal: "gain",
        sex: "prefer_not_to_say",
        currentWeightKg: 92,
        targetWeightKg: 76,
        heightCm: 156,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
  it("reports a reminder change only when a time is confirmed", async () => {
    const screen = render(<SettingsScreen />);

    // Open the picker from the weekly weigh-in reminder row (index 0) — the
    // other "Reminder time" row is hydration's interval picker, a different
    // control. The daily food-log reminder no longer has its own time picker;
    // it defers to Meal reminders (notifyTimes is authoritative).
    fireEvent.press(screen.getAllByText("Reminder time")[0]);
    fireEvent.press(await screen.findByText("confirm-time"));

    expect(mockTrack).toHaveBeenCalledWith("thrivo.reminder_set", {
      reminder: "weightCheckReminderTime",
    });
  });
});
