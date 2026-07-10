import { fireEvent, render } from "@testing-library/react-native";
import type { FoodLogEntry, HistoryDay } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { FoodHistoryScreen } from "../components/FoodHistoryScreen";

const mockUseFoodLogHistory = jest.fn();
const mockEditFoodLogSheet = jest.fn((_props: unknown) => null);
const mockUseFavorites = jest.fn();
const mockUseToggleFavorite = jest.fn();

jest.mock("../hooks/useDashboard", () => ({
  useFoodLogHistory: () => mockUseFoodLogHistory(),
}));

jest.mock("@/features/food-logging", () => ({
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
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    mockUseFoodLogHistory.mockReturnValue({
      data: { days: [historyDay], historyLimitDays: 30 },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
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
});
