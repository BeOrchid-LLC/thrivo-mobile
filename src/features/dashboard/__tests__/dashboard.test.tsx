import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import Dashboard from "../../../../app/(app)/(tabs)/dashboard";
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
const mockUseCheckins = jest.fn();
const mockUseCreateCheckin = jest.fn();
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

// The deep path, matching how DashboardSections imports it — the feature barrel
// re-exports CheckinScreen, which imports back into @/features/dashboard.
jest.mock("@/features/checkin/hooks/useCheckin", () => ({
  useCheckins: () => mockUseCheckins(),
  useCreateCheckin: () => mockUseCreateCheckin(),
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
    mockUseCheckins.mockReturnValue(successQuery([]));
    mockUseCreateCheckin.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      data: undefined,
      variables: undefined,
    });
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
    // The gate is a centred card; its "View plans" button carries the title in
    // its label so the control is unambiguous to a screen reader.
    fireEvent.press(screen.getByLabelText("Subscribe to see your macros. View plans"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/subscription");
  });

  // A failing section says nothing. Four stacked "Could not load X" cards read as
  // a broken app rather than four slow queries, and pull-to-refresh already
  // covers the recovery the retry buttons used to offer.
  it("stays quiet when dashboard sections fail, without losing the page", () => {
    mockUseDashboardCalories.mockReturnValue(errorQuery);
    mockUseDashboardMacros.mockReturnValue(errorQuery);
    mockUseDashboardStreak.mockReturnValue(errorQuery);
    mockUseDashboardWater.mockReturnValue(errorQuery);

    const screen = renderDashboard();

    expect(screen.getByText("Hi, Ada")).toBeTruthy();
    expect(screen.queryByText("Could not load calories")).toBeNull();
    expect(screen.queryByText("Could not load macros")).toBeNull();
    expect(screen.queryByText("Could not load streak")).toBeNull();
    expect(screen.queryByText("Could not load water")).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
  });

  it("keeps the rest of the dashboard available when only the meal log fails", () => {
    mockUseDashboardMealLog.mockReturnValue(errorQuery);

    const screen = renderDashboard();

    expect(screen.getByText("of 1,800 daily target")).toBeTruthy();
    expect(screen.getByText("0 of 8 glasses")).toBeTruthy();
    expect(screen.queryByText("Could not load meals")).toBeNull();
  });

  it("renders the empty meal state and opens the log tab from the first-meal CTA", () => {
    const screen = renderDashboard();

    expect(screen.getByText("Nothing logged yet")).toBeTruthy();

    fireEvent.press(screen.getByText("Log first meal"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/log");
  });

  it("renders logged meals when the meal-log section has data", () => {
    mockUseDashboardMealLog.mockReturnValue(
      successQuery({ day: "2026-06-22", entries: [loggedEntry], isEmptyDay: false })
    );

    const screen = renderDashboard();

    expect(screen.getByText("Greek yogurt")).toBeTruthy();
  });

  it("groups today's entries under their meal, with a functional favorite heart", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);
    // 8am local, so the entry lands in the morning bucket wherever this runs.
    const breakfast = {
      ...loggedEntry,
      consumedAt: new Date(2026, 5, 22, 8, 0, 0).toISOString(),
    };
    mockUseDashboardMealLog.mockReturnValue(
      successQuery({ day: "2026-06-22", entries: [breakfast], isEmptyDay: false })
    );

    const screen = renderDashboard();

    // The header composes "Breakfast" and its total into one Text node.
    expect(screen.getByText(/Breakfast/)).toBeTruthy();
    // Once on the group header, once on the row.
    expect(screen.getAllByText(`${breakfast.nutrients.calories} kcal`)).toHaveLength(2);
    fireEvent.press(screen.getByLabelText("Add favorite"));

    expect(toggleFavorite).toHaveBeenCalledWith(loggedEntry.foodItemId);
  });

  it("offers the mood check-in and writes the tapped mood for today", () => {
    const mutate = jest.fn();
    mockUseCreateCheckin.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      data: undefined,
      variables: undefined,
    });

    const screen = renderDashboard();

    expect(screen.getByText("How are you feeling today?")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Feeling great"));

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ mood: "great" }));
  });

  it("collapses the mood row once today is already checked in", () => {
    const today = new Date();
    const day = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    mockUseCheckins.mockReturnValue(
      successQuery([{ id: "c1", mood: "good", day, note: null, tip: null, createdAt: day }])
    );

    const screen = renderDashboard();

    expect(screen.queryByText("How are you feeling today?")).toBeNull();
    expect(screen.getByText(/Feeling good/)).toBeTruthy();
  });
});
