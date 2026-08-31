import { fireEvent, render } from "@testing-library/react-native";
import type { FoodLogEntry, HistoryDay } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { FoodHistoryScreen } from "../components/FoodHistoryScreen";

const mockUseFoodLogHistory = jest.fn();
const mockEditFoodLogSheet = jest.fn((_props: unknown) => null);
const mockCopyLogSheet = jest.fn((_props: unknown) => null);
const mockUseFavorites = jest.fn();
const mockUseToggleFavorite = jest.fn();

const mockUseEntitlement = jest.fn();
// History is premium outright, so these list cases run as a subscriber; the
// gated arm has its own case below.
jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

jest.mock("../hooks/useDashboard", () => ({
  useFoodLogHistory: () => mockUseFoodLogHistory(),
}));

jest.mock("@/features/food-logging/hooks/useFoodLogging", () => ({
  useToggleFavorite: () => mockUseToggleFavorite(),
}));

jest.mock("@/features/food-logging", () => ({
  CopyLogSheet: (props: unknown) => mockCopyLogSheet(props),
  EditFoodLogSheet: (props: unknown) => mockEditFoodLogSheet(props),
  useFavorites: () => mockUseFavorites(),
  useToggleFavorite: () => mockUseToggleFavorite(),
}));

const entry: FoodLogEntry = {
  id: "entry-1",
  foodItemId: "food-1",
  name: "Greek yogurt",
  day: "2026-06-20",
  servings: 1,
  servingUnit: null,
  source: "search",
  barcode: null,
  isEstimated: false,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  consumedAt: "2026-06-20T12:00:00.000Z",
  loggedAt: "2026-06-20T12:00:00.000Z",
};

const historyDay: HistoryDay = {
  day: "2026-06-20",
  isLocked: false,
  lockReason: null,
  entries: [entry],
};

describe("FoodHistoryScreen", () => {
  const makePage = (override?: Partial<{ lockedRange: unknown }>) => ({
    period: "1m",
    date: "2026-06-20",
    from: "2026-05-22",
    to: "2026-06-20",
    days: [historyDay],
    lockedRange: override?.lockedRange ?? null,
    historyLimitDays: 7,
    nextCursor: null,
  });

  beforeEach(() => {
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    mockUseFoodLogHistory.mockReturnValue({
      data: { pages: [makePage()], pageParams: [null] },
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
  });

  it("gates the whole screen for free users", async () => {
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });
    const view = render(<FoodHistoryScreen />);
    expect(await view.findByText("Subscribe to see your food history")).toBeTruthy();
  });

  it("opens the edit sheet with the tapped entry", () => {
    const screen = render(<FoodHistoryScreen />);

    fireEvent.press(screen.getByLabelText("View Greek yogurt"));

    expect(mockEditFoodLogSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ entry, visible: true })
    );
  });

  it("passes a null entry and visible=false before any tap", () => {
    render(<FoodHistoryScreen />);

    expect(mockEditFoodLogSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ entry: null, visible: false })
    );
  });

  it("toggles favorite from a history entry row", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);

    const screen = render(<FoodHistoryScreen />);
    fireEvent.press(screen.getByLabelText("Add favorite"));

    expect(toggleFavorite).toHaveBeenCalledWith(entry.foodItemId);
  });

  it("shows one earlier-history gate for a locked range", () => {
    mockUseFoodLogHistory.mockReturnValue({
      data: {
        pages: [
          makePage({
            lockedRange: {
              from: "2026-05-22",
              to: "2026-06-13",
              lockReason: "free_history_limit",
            },
          }),
        ],
        pageParams: [null],
      },
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    const screen = render(<FoodHistoryScreen />);

    expect(screen.getAllByText("Earlier history")).toHaveLength(1);
    expect(screen.getByText("Free history includes the most recent 7 days.")).toBeTruthy();
  });
});
