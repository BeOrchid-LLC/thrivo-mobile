import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/errors";
import { ProgressScreen } from "../screens/ProgressScreen";

const mockUseProgress = jest.fn();
const mockUseMetricChart = jest.fn();
const mockUseWeightContext = jest.fn();
const mockUseAddWeight = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("../hooks/useProgress", () => ({
  useProgress: () => mockUseProgress(),
  useMetricChart: (metric: string, period: string) => mockUseMetricChart(metric, period),
  useWeightContext: () => mockUseWeightContext(),
  useAddWeight: () => mockUseAddWeight(),
}));

const progress = {
  progress: {
    day: "2026-06-28",
    summary: {
      currentWeightKg: 80.7,
      targetWeightKg: 70.3,
      goalGapKg: 10.4,
      currentStreakDays: 14,
      longestStreakDays: 21,
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
  });

  it("renders the progress summary and default chart", () => {
    const screen = render(<ProgressScreen />);

    expect(screen.getByText("Progress")).toBeTruthy();
    expect(screen.getByText("Current weight")).toBeTruthy();
    expect(screen.getByText("Logging streak")).toBeTruthy();
    expect(screen.getByText("Weight over time")).toBeTruthy();
    expect(screen.getByText("-0.9 lbs / week")).toBeTruthy();
  });

  it("switches metric tabs and period selections", () => {
    const screen = render(<ProgressScreen />);

    fireEvent.press(screen.getByText("Calories"));
    fireEvent.press(screen.getAllByText("14 days")[1]);

    expect(mockUseMetricChart).toHaveBeenLastCalledWith("calories", "14d");
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

  it("navigates to the food logging tab", () => {
    const screen = render(<ProgressScreen />);
    fireEvent.press(screen.getByText("Log something you ate"));

    expect(router.push).toHaveBeenCalledWith("/(app)/log");
  });
});
