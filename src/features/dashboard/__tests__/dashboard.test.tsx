import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import Dashboard from "../../../../app/(app)/dashboard";
import type { User } from "@/contracts";

const mockUseMe = jest.fn();
const mockPush = jest.fn();

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
}));

const profile: User = {
  id: "68711c81-d52c-4798-9fb0-ccda25f27a24",
  email: "ada@example.com",
  name: "Ada",
  goal: "lose",
  sex: "female",
  age: 34,
  heightCm: "170.0",
  weightKg: "82.5",
  targetWeightKg: "74.0",
  tdeeKcal: 2200,
  dailyTargetKcal: 1800,
  targetProteinG: 135,
  targetCarbsG: 180,
  targetFatG: 60,
  activityLevel: "moderate",
  manualDailyTargetKcal: null,
  notifyAt: null,
  timezone: "Africa/Lagos",
  tier: "free",
  accountStatus: "free_trial",
  trialEndsAt: "2026-06-26T00:00:00.000Z",
  onboardingStep: 7,
  isOnboarded: true,
  createdAt: "2026-06-18T00:00:00.000Z",
};

describe("Dashboard empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router as unknown as { push: jest.Mock }).push = mockPush;
    mockUseMe.mockReturnValue({
      data: profile,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it("renders the profile-backed greeting, zero totals, and first-meal CTA", () => {
    const screen = render(<Dashboard />);

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
    expect(screen.getByText("of 1,800 kcal")).toBeTruthy();
    expect(screen.getByText("0 of 8 cups today")).toBeTruthy();
    expect(screen.getByText("Your food log is empty")).toBeTruthy();
  });

  it("opens the log tab from the first-meal CTA", () => {
    const screen = render(<Dashboard />);

    fireEvent.press(screen.getByText("Log first meal"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/log");
  });
});
