import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import Dashboard from "../../../../app/(app)/dashboard";
import type { Dashboard as DashboardData, FoodLogEntry } from "@/contracts";

const mockUseMe = jest.fn();
const mockUseDashboard = jest.fn();
const mockUseTodayFoodLog = jest.fn();
const mockUseAddWater = jest.fn();
const mockPush = jest.fn();

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
}));

jest.mock("../hooks/useDashboard", () => ({
  useDashboard: () => mockUseDashboard(),
  useTodayFoodLog: () => mockUseTodayFoodLog(),
  useAddWater: () => mockUseAddWater(),
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

const lunchEntry: FoodLogEntry = {
  id: "entry-1",
  foodItemId: "food-1",
  name: "Greek yogurt",
  meal: "lunch",
  day: "2026-06-22",
  servings: 1,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  loggedAt: "2026-06-22T12:00:00.000Z",
};

const loadingQuery = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};

const errorQuery = {
  data: undefined,
  isLoading: false,
  isError: true,
  refetch: jest.fn(),
};

const successQuery = <T,>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
});

describe("Dashboard graceful degradation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (router as unknown as { push: jest.Mock }).push = mockPush;
    mockUseMe.mockReturnValue(successQuery({ name: "Ada Lovelace" }));
    mockUseDashboard.mockReturnValue(successQuery(emptyDashboard));
    mockUseTodayFoodLog.mockReturnValue(successQuery([]));
    mockUseAddWater.mockReturnValue({ mutate: jest.fn(), isPending: false, error: null });
  });

  it("renders static header content while dashboard sections are loading", () => {
    mockUseMe.mockReturnValue(loadingQuery);
    mockUseDashboard.mockReturnValue(loadingQuery);
    mockUseTodayFoodLog.mockReturnValue(loadingQuery);

    const screen = render(<Dashboard />);

    expect(screen.getByText("Hi, there")).toBeTruthy();
    expect(
      screen.getByText(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),/)
    ).toBeTruthy();
    expect(screen.getByLabelText("Loading calorie summary")).toBeTruthy();
    expect(screen.getByLabelText("Loading macros")).toBeTruthy();
    expect(screen.getByLabelText("Loading water tracker")).toBeTruthy();
    expect(screen.getByLabelText("Loading today's meal log")).toBeTruthy();
    expect(screen.queryByText("Loading your dashboard...")).toBeNull();
  });

  it("renders the cached first name immediately when profile data is available", () => {
    const screen = render(<Dashboard />);

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
  });

  it("shows dashboard section errors without hiding static content", () => {
    mockUseDashboard.mockReturnValue(errorQuery);

    const screen = render(<Dashboard />);

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
    expect(screen.getByText("Could not load calories")).toBeTruthy();
    expect(screen.getByText("Could not load macros")).toBeTruthy();
    expect(screen.getByText("Could not load streak")).toBeTruthy();
    expect(screen.getByText("Could not load water")).toBeTruthy();
  });

  it("keeps the rest of the dashboard available when only the meal log fails", () => {
    mockUseTodayFoodLog.mockReturnValue(errorQuery);

    const screen = render(<Dashboard />);

    expect(screen.getByText("of 1,800 daily target")).toBeTruthy();
    expect(screen.getByText("0 of 8 glasses")).toBeTruthy();
    expect(screen.getByText("Could not load meals")).toBeTruthy();
    expect(screen.queryByText("Could not load calories")).toBeNull();
  });

  it("renders the empty meal state and opens the log tab from the first-meal CTA", () => {
    const screen = render(<Dashboard />);

    expect(screen.getByText("Nothing logged yet")).toBeTruthy();

    fireEvent.press(screen.getByText("Log first meal"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/log");
  });

  it("renders logged meals when the meal-log section has data", () => {
    mockUseTodayFoodLog.mockReturnValue(successQuery([lunchEntry]));

    const screen = render(<Dashboard />);

    expect(screen.getByText("Greek yogurt")).toBeTruthy();
  });
});
