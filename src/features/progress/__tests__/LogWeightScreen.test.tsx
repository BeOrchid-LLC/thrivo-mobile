import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { LogWeightScreen } from "../screens/LogWeightScreen";

const mockUseWeightContext = jest.fn();
const mockUseAddWeight = jest.fn();
const mockUseSettings = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

jest.mock("../hooks/useProgress", () => ({
  useWeightContext: () => mockUseWeightContext(),
  useAddWeight: () => mockUseAddWeight(),
}));

jest.mock("@/features/settings", () => ({
  useSettings: () => mockUseSettings(),
}));

jest.mock("@/hooks/useCurrentDay", () => ({
  useCurrentDay: () => "2026-06-18",
}));

const weightContext = {
  context: {
    day: "2026-06-18",
    currentWeightKg: 80.7,
    yesterdayWeightKg: 80.9,
    sevenDayAverageKg: 81.2,
    targetWeightKg: 70.3,
    projection: {
      projectedDate: "2026-11-01",
      projectedMonth: "Nov 2026",
      weeklyRateKg: -0.2,
      status: "on_track" as const,
    },
  },
};

describe("LogWeightScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeightContext.mockReturnValue({
      data: weightContext,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseAddWeight.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseSettings.mockReturnValue({ data: { unitSystem: "imperial" } });
  });

  it("renders the weigh-in comparisons against the logged day", () => {
    const screen = render(<LogWeightScreen />);

    expect(screen.getByText("Log weight")).toBeTruthy();
    expect(screen.getByText("What does the scale say today?")).toBeTruthy();
    expect(screen.getByText("Yesterday")).toBeTruthy();
    expect(screen.getByText("June 17")).toBeTruthy();
    // The average covers yesterday back six more days, not the day being logged.
    expect(screen.getByText("7-day average")).toBeTruthy();
    expect(screen.getByText("June 11 - 17")).toBeTruthy();
    expect(screen.getByText("Goal weight")).toBeTruthy();
    // Rate and status compose into one line: bold number, regular status.
    expect(screen.getByText("-0.4 lbs On track")).toBeTruthy();
  });

  it("steps the weight and saves it back in kilograms", () => {
    const mutate = jest.fn();
    mockUseAddWeight.mockReturnValue({ mutate, isPending: false });

    const screen = render(<LogWeightScreen />);
    fireEvent.press(screen.getByLabelText("Increase"));

    expect(screen.getByDisplayValue("178.4")).toBeTruthy();

    fireEvent.press(screen.getByText("Save weight"));

    expect(mutate).toHaveBeenCalledWith({ day: "2026-06-18", weightKg: 80.9 }, expect.any(Object));
  });

  it("returns to the progress tab after a successful save", () => {
    const mutate = jest.fn((_payload, options: { onSuccess: () => void }) => options.onSuccess());
    mockUseAddWeight.mockReturnValue({ mutate, isPending: false });

    const screen = render(<LogWeightScreen />);
    fireEvent.press(screen.getByText("Save weight"));

    expect(router.back).toHaveBeenCalled();
  });

  it("falls back to the progress tab when there is nothing to pop", () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);

    const screen = render(<LogWeightScreen />);
    fireEvent.press(screen.getByLabelText("Back"));

    expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)/metrics");
  });
});
