import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import Dashboard from "../../../../app/(app)/dashboard";
import type { Dashboard as DashboardData } from "@/contracts";

const mockUseMe = jest.fn();
const mockUseDashboard = jest.fn();
const mockUseTodayFoodLog = jest.fn();
const mockPush = jest.fn();

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
}));

// Pull the real presentational components from their files (they don't import
// the api/query-client chain), but mock the data hooks.
jest.mock("@/features/dashboard", () => ({
  MacroBars: jest.requireActual("../components/MacroBars").MacroBars,
  StreakBanner: jest.requireActual("../components/StreakBanner").StreakBanner,
  WaterTracker: jest.requireActual("../components/WaterTracker").WaterTracker,
  MealLog: jest.requireActual("../components/MealLog").MealLog,
  useDashboard: () => mockUseDashboard(),
  useTodayFoodLog: () => mockUseTodayFoodLog(),
  useAddWater: () => ({ mutate: jest.fn(), isPending: false }),
}));

const emptyDashboard: DashboardData = {
  day: "2026-06-22",
  consumed: { day: "2026-06-22", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  targetCalories: 1800,
  targetProteinG: 135,
  targetCarbsG: 180,
  targetFatG: 60,
  streakDays: 0,
  latestWeightKg: null,
  waterMl: 0,
};

describe("Dashboard empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router as unknown as { push: jest.Mock }).push = mockPush;
    mockUseMe.mockReturnValue({ data: { name: "Ada" }, isLoading: false, isError: false });
    mockUseDashboard.mockReturnValue({
      data: emptyDashboard,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseTodayFoodLog.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it("renders the greeting, daily target, empty water, and first-meal CTA", () => {
    const screen = render(<Dashboard />);

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
    expect(screen.getByText("of 1,800 daily target")).toBeTruthy();
    expect(screen.getByText("0 of 8 glasses")).toBeTruthy();
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("opens the log tab from the first-meal CTA", () => {
    const screen = render(<Dashboard />);

    fireEvent.press(screen.getByText("Log first meal"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/log");
  });
});
