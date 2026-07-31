import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import Dashboard from "../../../../app/(app)/dashboard";
import type {
  DashboardCalories,
  FoodLogEntry,
  MacroSummary,
  StreakSummary,
  Water,
} from "@/contracts";
import { useFavoritesStore } from "@/stores";

const mockUseMe = jest.fn();
const mockUseDashboardCalories = jest.fn();
const mockUseDashboardMacros = jest.fn();
const mockUseDashboardStreak = jest.fn();
const mockUseDashboardWater = jest.fn();
const mockUseDashboardMealLog = jest.fn();
const mockUseAddWater = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseToggleFavorite = jest.fn();
const mockPush = jest.fn();

jest.mock("@/features/profile", () => ({
  useMe: () => mockUseMe(),
}));

jest.mock("../hooks/useDashboard", () => ({
  useDashboardCalories: () => mockUseDashboardCalories(),
  useDashboardMacros: () => mockUseDashboardMacros(),
  useDashboardStreak: () => mockUseDashboardStreak(),
  useDashboardWater: () => mockUseDashboardWater(),
  useDashboardMealLog: () => mockUseDashboardMealLog(),
  useAddWater: () => mockUseAddWater(),
}));

jest.mock("@/features/food-logging/hooks/useFoodLogging", () => {
  const actual = jest.requireActual("@/features/food-logging/hooks/useFoodLogging");
  return {
    ...actual,
    useFavorites: () => mockUseFavorites(),
    useToggleFavorite: () => mockUseToggleFavorite(),
  };
});

jest.mock("@/features/food-logging", () => {
  const actual = jest.requireActual("@/features/food-logging");
  return {
    ...actual,
    useFavorites: () => mockUseFavorites(),
    useToggleFavorite: () => mockUseToggleFavorite(),
  };
});

const emptyCalories: DashboardCalories = {
  day: "2026-06-22",
  consumedCalories: 0,
  targetCalories: 1800,
  remainingCalories: 1800,
  percentUsed: 0,
};

const emptyMacros: MacroSummary = {
  day: "2026-06-22",
  consumed: { proteinG: 0, carbsG: 0, fatG: 0 },
  target: { proteinG: 135, carbsG: 180, fatG: 60 },
};

const emptyStreak: StreakSummary = {
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastLoggedDay: null,
};

const emptyWater: Water = {
  day: "2026-06-22",
  totalMl: 0,
  targetMl: 2000,
  remainingMl: 2000,
  progressPercent: 0,
  glassMl: 250,
  glasses: 0,
  targetGlasses: 8,
  entries: [],
  alert: null,
};

const loggedEntry: FoodLogEntry = {
  id: "entry-1",
  foodItemId: "food-1",
  name: "Greek yogurt",
  day: "2026-06-22",
  servings: 1,
  servingUnit: null,
  source: "search",
  barcode: null,
  isEstimated: false,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  consumedAt: "2026-06-22T12:00:00.000Z",
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

// TodayMealLogSection renders EditFoodLogSheet, whose hooks (useUpdateFoodLog/
// useDeleteFoodLog) need a real QueryClient in context even when the sheet is closed.
function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return render(<Dashboard />, { wrapper });
}

describe("Dashboard graceful degradation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    (router as unknown as { push: jest.Mock }).push = mockPush;
    mockUseMe.mockReturnValue(successQuery({ name: "Ada Lovelace" }));
    mockUseDashboardCalories.mockReturnValue(successQuery(emptyCalories));
    mockUseDashboardMacros.mockReturnValue(successQuery(emptyMacros));
    mockUseDashboardStreak.mockReturnValue(successQuery(emptyStreak));
    mockUseDashboardWater.mockReturnValue(successQuery(emptyWater));
    mockUseDashboardMealLog.mockReturnValue(
      successQuery({ day: "2026-06-22", entries: [], isEmptyDay: true })
    );
    mockUseAddWater.mockReturnValue({ mutate: jest.fn(), isPending: false, error: null });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
  });

  it("renders static header content while dashboard sections are loading", () => {
    mockUseMe.mockReturnValue(loadingQuery);
    mockUseDashboardCalories.mockReturnValue(loadingQuery);
    mockUseDashboardMacros.mockReturnValue(loadingQuery);
    mockUseDashboardStreak.mockReturnValue(loadingQuery);
    mockUseDashboardWater.mockReturnValue(loadingQuery);
    mockUseDashboardMealLog.mockReturnValue(loadingQuery);

    const screen = renderDashboard();

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
    const screen = renderDashboard();

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
  });

  it("renders the premium macro gate for free users", () => {
    mockUseDashboardMacros.mockReturnValue({
      ...successQuery(emptyMacros),
      isPremium: false,
      isEntitlementLoading: false,
    });

    const screen = renderDashboard();

    expect(screen.getByText("Subscribe to see your macros")).toBeTruthy();
    fireEvent.press(screen.getByText("View plans"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings/subscription");
  });

  it("shows dashboard section errors without hiding static content", () => {
    mockUseDashboardCalories.mockReturnValue(errorQuery);
    mockUseDashboardMacros.mockReturnValue(errorQuery);
    mockUseDashboardStreak.mockReturnValue(errorQuery);
    mockUseDashboardWater.mockReturnValue(errorQuery);

    const screen = renderDashboard();

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
    expect(screen.getByText("Could not load calories")).toBeTruthy();
    expect(screen.getByText("Could not load macros")).toBeTruthy();
    expect(screen.getByText("Could not load streak")).toBeTruthy();
    expect(screen.getByText("Could not load water")).toBeTruthy();
  });

  it("keeps the rest of the dashboard available when only the meal log fails", () => {
    mockUseDashboardMealLog.mockReturnValue(errorQuery);

    const screen = renderDashboard();

    expect(screen.getByText("of 1,800 daily target")).toBeTruthy();
    expect(screen.getByText("0 of 8 glasses")).toBeTruthy();
    expect(screen.getByText("Could not load meals")).toBeTruthy();
    expect(screen.queryByText("Could not load calories")).toBeNull();
  });

  it("renders the empty meal state and opens the log tab from the first-meal CTA", () => {
    const screen = renderDashboard();

    expect(screen.getByText("Nothing logged yet")).toBeTruthy();

    fireEvent.press(screen.getByText("Log first meal"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/log");
  });

  it("renders logged meals when the meal-log section has data", () => {
    mockUseDashboardMealLog.mockReturnValue(
      successQuery({ day: "2026-06-22", entries: [loggedEntry], isEmptyDay: false })
    );

    const screen = renderDashboard();

    expect(screen.getByText("Greek yogurt")).toBeTruthy();
  });

  it("shows the logged time and a functional favorite heart on today's entries", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);
    mockUseDashboardMealLog.mockReturnValue(
      successQuery({ day: "2026-06-22", entries: [loggedEntry], isEmptyDay: false })
    );

    const screen = renderDashboard();

    const expectedTime = new Date(loggedEntry.consumedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    expect(screen.getByText(new RegExp(expectedTime.replace(/\s/g, "\\s")))).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Add favorite"));

    expect(toggleFavorite).toHaveBeenCalledWith(loggedEntry.foodItemId);
  });
});
