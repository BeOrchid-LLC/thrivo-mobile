import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/errors";
import { emitTabRootReset } from "@/navigation/tab-root-reset";
import { ProgressScreen } from "../screens/ProgressScreen";

const mockUseProgress = jest.fn();
const mockUseMetricChart = jest.fn();
const mockUseWeightContext = jest.fn();
const mockUseAddWeight = jest.fn();
const mockUseSettings = jest.fn();
const mockUseEntitlement = jest.fn();
const mockUseFoodLogDay = jest.fn();

const currentStreakDays = 14;
const longestStreakDays = 21;

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("../hooks/useProgress", () => ({
  useProgress: () => mockUseProgress(),
  useMetricChart: (metric: string, period: string) => mockUseMetricChart(metric, period),
  useWeightContext: () => mockUseWeightContext(),
  useAddWeight: () => mockUseAddWeight(),
}));

jest.mock("@/features/settings", () => ({
  useSettings: () => mockUseSettings(),
}));

jest.mock("@/features/food-logging", () => ({
  useFoodLogDay: () => mockUseFoodLogDay(),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

const progress = {
  progress: {
    day: "2026-06-28",
    summary: {
      currentWeightKg: 80.7,
      targetWeightKg: 70.3,
      goalGapKg: 10.4,
      currentStreakDays,
      longestStreakDays,
      currentWeekAverageKcal: 1621,
    },
    projection: {
      projectedDate: "2026-11-01",
      projectedMonth: "Nov 2026",
      weeklyRateKg: -0.4,
      status: "on_track" as const,
    },
    calendar: {
      month: "June 2026",
      days: Array.from({ length: 35 }, (_, index) => ({
        day: `2026-06-${String(index + 1).padStart(2, "0")}`,
        dayOfMonth: index + 1,
        logged: index < 18,
        today: index === 17,
        inMonth: true,
      })),
    },
  },
};

const chart = {
  chart: {
    metric: "weight" as const,
    period: "7d" as const,
    unit: "kg" as const,
    from: "2026-06-22",
    to: "2026-06-28",
    points: [
      { date: "2026-06-22", value: 81.5 },
      { date: "2026-06-23", value: 81.1 },
      { date: "2026-06-28", value: 80.7 },
    ],
  },
};

const weightContext = {
  context: {
    day: "2026-06-28",
    currentWeightKg: 80.7,
    yesterdayWeightKg: 80.9,
    sevenDayAverageKg: 81.2,
    targetWeightKg: 70.3,
    projection: progress.progress.projection,
  },
};

const successQuery = <T,>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
});

describe("ProgressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProgress.mockReturnValue(successQuery(progress));
    mockUseMetricChart.mockReturnValue(successQuery(chart));
    mockUseWeightContext.mockReturnValue(successQuery(weightContext));
    mockUseAddWeight.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSettings.mockReturnValue({ data: { unitSystem: "imperial" } });
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });
    mockUseFoodLogDay.mockReturnValue(
      successQuery({
        day: "2026-06-18",
        entries: [],
        isEmptyDay: true,
        isLocked: false,
        lockReason: null,
        historyLimitDays: 7,
        totals: { day: "2026-06-18", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      })
    );
  });

  it("renders the progress summary and default chart", () => {
    const screen = render(<ProgressScreen />);

    expect(screen.getByText("Progress")).toBeTruthy();
    expect(screen.getByText("Current weight")).toBeTruthy();
    expect(screen.queryByText("Logging streak")).toBeNull();
    expect(screen.getByText(`Current streak: ${currentStreakDays}`)).toBeTruthy();
    expect(screen.getByText(`Personal best: ${longestStreakDays}`)).toBeTruthy();
    expect(screen.getByText("Weight over time")).toBeTruthy();
    expect(screen.getByText("-0.9 lbs / week")).toBeTruthy();
  });

  it("renders streak values from the progress response", () => {
    mockUseProgress.mockReturnValue(
      successQuery({
        progress: {
          ...progress.progress,
          summary: {
            ...progress.progress.summary,
            currentStreakDays: 3,
            longestStreakDays: 9,
          },
        },
      })
    );

    const screen = render(<ProgressScreen />);

    expect(screen.getByText("Current streak: 3")).toBeTruthy();
    expect(screen.getByText("Personal best: 9")).toBeTruthy();
    expect(screen.queryByText(`Current streak: ${currentStreakDays}`)).toBeNull();
    expect(screen.queryByText(`Personal best: ${longestStreakDays}`)).toBeNull();
  });

  it("switches metric tabs and period selections", () => {
    const screen = render(<ProgressScreen />);

    fireEvent.press(screen.getByLabelText("Select progress metric"));
    fireEvent.press(screen.getByLabelText("Calories"));
    fireEvent.press(screen.getByLabelText("Select time period"));
    fireEvent.press(screen.getByLabelText("14 days"));

    expect(mockUseMetricChart).toHaveBeenLastCalledWith("calories", "14d");
  });

  it("locks premium period options for free users and links to subscription settings", () => {
    const screen = render(<ProgressScreen />);

    fireEvent.press(screen.getByLabelText("Select time period"));
    fireEvent.press(screen.getByLabelText("Month, premium required"));

    expect(screen.getByText("Premium required")).toBeTruthy();
    expect(screen.getByText("You have to be premium to view this option.")).toBeTruthy();

    fireEvent.press(screen.getByText("View subscription plans"));

    expect(router.push).toHaveBeenCalledWith("/(app)/settings/subscription");
    expect(mockUseMetricChart).toHaveBeenLastCalledWith("weight", "7d");
  });

  it("lets premium users select long period options", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });
    const screen = render(<ProgressScreen />);

    fireEvent.press(screen.getByLabelText("Select time period"));
    fireEvent.press(screen.getByLabelText("Month"));

    expect(mockUseMetricChart).toHaveBeenLastCalledWith("weight", "1m");
  });

  it("shows an upgrade prompt for long periods", () => {
    mockUseMetricChart.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError({
        code: "PREMIUM_REQUIRED",
        message: "Premium is required",
        status: 403,
      }),
    });

    const screen = render(<ProgressScreen />);

    expect(screen.getByText("Unlock longer history")).toBeTruthy();
  });

  it("logs weight from the sub-screen", () => {
    const mutate = jest.fn();
    mockUseAddWeight.mockReturnValue({ mutate, isPending: false });

    const screen = render(<ProgressScreen />);
    fireEvent.press(screen.getByText("Log this week’s weight"));
    fireEvent.changeText(screen.getByDisplayValue("177.9"), "178.0");
    fireEvent.press(screen.getByText("Save weight"));

    expect(screen.getByText("Log weight")).toBeTruthy();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ day: expect.any(String), weightKg: expect.any(Number) }),
      expect.any(Object)
    );
  });

  it("resets to the default progress screen when the progress tab is pressed", () => {
    const screen = render(<ProgressScreen />);
    fireEvent.press(screen.getByText("Log this week’s weight"));

    expect(screen.getByText("Log weight")).toBeTruthy();

    act(() => {
      emitTabRootReset("metrics");
    });

    expect(screen.getByText("Progress")).toBeTruthy();
    expect(screen.getByText("Weight over time")).toBeTruthy();
    expect(screen.queryByText("Log weight")).toBeNull();
  });

  it("navigates to the food logging tab", () => {
    const screen = render(<ProgressScreen />);
    fireEvent.press(screen.getByText("Log something you ate"));

    expect(router.push).toHaveBeenCalledWith("/(app)/log");
  });

  it("opens a food-log sheet when a calendar date is pressed", () => {
    mockUseFoodLogDay.mockReturnValue(
      successQuery({
        day: "2026-06-18",
        entries: [
          {
            id: "food-log-1",
            foodItemId: null,
            name: "Greek yogurt",
            day: "2026-06-18",
            servings: 1,
            servingUnit: "cup",
            source: "manual",
            barcode: null,
            isEstimated: false,
            nutrients: { calories: 130, proteinG: 12, carbsG: 14, fatG: 4 },
            consumedAt: "2026-06-18T08:00:00.000Z",
            loggedAt: "2026-06-18T08:05:00.000Z",
          },
        ],
        isEmptyDay: false,
        isLocked: false,
        lockReason: null,
        historyLimitDays: 7,
        totals: { day: "2026-06-18", calories: 130, proteinG: 12, carbsG: 14, fatG: 4 },
      })
    );

    const screen = render(<ProgressScreen />);
    fireEvent.press(screen.getByLabelText("View logs for 2026-06-18"));

    expect(screen.getByText("Greek yogurt")).toBeTruthy();
    expect(screen.getAllByText("130 kcal").length).toBeGreaterThan(0);
  });
});
