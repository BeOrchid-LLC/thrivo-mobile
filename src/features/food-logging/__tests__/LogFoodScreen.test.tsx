import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { FoodItem } from "@/contracts";
import { emitTabRootReset } from "@/navigation/tab-root-reset";
import { useFavoritesStore, useSessionStore } from "@/stores";
import { localDay } from "@/utils";
import { LogFoodScreen } from "../screens/LogFoodScreen";

const mockUseFoodSearch = jest.fn();
const mockUseRecentFoods = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseLogFood = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseRemoveFavorite = jest.fn();
const mockUseToggleFavorite = jest.fn();
const mockUseUpdateFoodLog = jest.fn();
const mockUseDeleteFoodLog = jest.fn();
const mockUseFoodDetail = jest.fn();
const mockUseWater = jest.fn();
const mockUseAddWaterLog = jest.fn();
const mockUseUpdateWaterLog = jest.fn();
const mockUseDeleteWaterLog = jest.fn();
const mockUseEstimateFood = jest.fn();
const mockUseLogEstimate = jest.fn();
const mockUseBarcodeLookup = jest.fn();
const mockCameraScan = jest.fn();
const mockUseSettings = jest.fn();
const mockIsNetworkReachable = jest.fn(async () => true);
const mockQueueBarcodeScan = jest.fn();
const mockReadQueuedBarcodeScans = jest.fn(async (..._args: unknown[]) => [] as unknown[]);
const mockRemoveQueuedBarcodeScan = jest.fn();
const mockTrack = jest.fn();

jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return {
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned?: (result: unknown) => void }) => {
      mockCameraScan.mockImplementation(() =>
        onBarcodeScanned?.({ data: "1234567890123", raw: "1234567890123", type: "ean13" })
      );
      return <View testID="camera-view" />;
    },
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

jest.mock("@/lib", () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
  isNetworkReachable: () => mockIsNetworkReachable(),
  queueBarcodeScan: (...args: unknown[]) => mockQueueBarcodeScan(...args),
  readQueuedBarcodeScans: (...args: unknown[]) => mockReadQueuedBarcodeScans(...args),
  removeQueuedBarcodeScan: (...args: unknown[]) => mockRemoveQueuedBarcodeScan(...args),
}));

jest.mock("../hooks/useFoodLogging", () => ({
  useFoodSearch: (query: string) => mockUseFoodSearch(query),
  useRecentFoods: () => mockUseRecentFoods(),
  useFavorites: () => mockUseFavorites(),
  useLogFood: () => mockUseLogFood(),
  useAddFavorite: () => mockUseAddFavorite(),
  useRemoveFavorite: () => mockUseRemoveFavorite(),
  useToggleFavorite: () => mockUseToggleFavorite(),
  useUpdateFoodLog: () => mockUseUpdateFoodLog(),
  useDeleteFoodLog: () => mockUseDeleteFoodLog(),
  useFoodDetail: (...args: unknown[]) => mockUseFoodDetail(...args),
  useWater: () => mockUseWater(),
  useAddWaterLog: () => mockUseAddWaterLog(),
  useUpdateWaterLog: () => mockUseUpdateWaterLog(),
  useDeleteWaterLog: () => mockUseDeleteWaterLog(),
  useEstimateFood: () => mockUseEstimateFood(),
  useLogEstimate: () => mockUseLogEstimate(),
  useBarcodeLookup: (barcode: string | null) => mockUseBarcodeLookup(barcode),
}));

jest.mock("@/features/settings", () => ({
  useSettings: () => mockUseSettings(),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ isPremium: true, isLoading: false }),
}));

const food = {
  id: "food-1",
  name: "Chicken breast, grilled",
  brand: null,
  barcode: null,
  source: "authoritative" as const,
  servingLabel: "100g",
  servingGrams: 100,
  nutrients: { calories: 165, proteinG: 31, carbsG: 0, fatG: 4 },
  servingOptions: [],
  isPersonal: false,
  isEstimated: false,
};

const recentEntry = {
  id: "entry-1",
  foodItemId: "food-1",
  name: "Greek yogurt",
  day: localDay(),
  servings: 1,
  servingUnit: null,
  source: "search" as const,
  barcode: null,
  isEstimated: false,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  consumedAt: new Date().toISOString(),
  loggedAt: new Date().toISOString(),
};

const searchFood: FoodItem = {
  ...food,
  id: "food-search-1",
  isEstimated: true,
};

const water = {
  day: "2026-06-27",
  totalMl: 980,
  targetMl: 2000,
  remainingMl: 1020,
  progressPercent: 49,
  glassMl: 250,
  glasses: 3,
  targetGlasses: 8,
  alert: {
    title: "Drink up",
    message: "You're behind your hydration pace.",
    severity: "warning" as const,
  },
  entries: [
    {
      id: "water-1",
      amountMl: 250,
      day: "2026-06-27",
      recordedAt: "2026-06-27T08:15:00.000Z",
    },
  ],
};

const successQuery = <T,>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
});

const successSearch = (items: FoodItem[] = []) => ({
  ...successQuery({ pages: [{ items, nextCursor: null, phase: "local" as const, cached: false }] }),
  items,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
});

describe("LogFoodScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    // The session store is module state; a test that signs someone in would
    // otherwise leave them signed in for every test after it.
    useSessionStore.setState({ userId: null });
    mockUseFoodSearch.mockReturnValue(successSearch());
    mockUseRecentFoods.mockReturnValue(successQuery({ items: [] }));
    mockUseFavorites.mockReturnValue(successQuery({ items: [] }));
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
    mockUseUpdateFoodLog.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseDeleteFoodLog.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: false });
    mockUseWater.mockReturnValue(successQuery(water));
    mockUseAddWaterLog.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseUpdateWaterLog.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
    });
    mockUseDeleteWaterLog.mockReturnValue({ mutate: jest.fn() });
    mockUseEstimateFood.mockReturnValue({ mutate: jest.fn(), isPending: false, data: undefined });
    mockUseLogEstimate.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food: null }));
    mockUseSettings.mockReturnValue({ data: { unitSystem: "metric" } });
    mockIsNetworkReachable.mockResolvedValue(true);
    mockQueueBarcodeScan.mockResolvedValue(undefined);
    mockReadQueuedBarcodeScans.mockResolvedValue([]);
  });

  it("renders the empty food state", () => {
    const screen = render(<LogFoodScreen />);

    expect(screen.getByText("Food Logs")).toBeTruthy();
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("opens the log sheet for a selected search result, clearing the search", async () => {
    const mutate = jest.fn();
    mockUseFoodSearch.mockReturnValue(successSearch([searchFood]));
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(<LogFoodScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Or, search food by name..."), "Chic");
    await waitFor(() => expect(screen.getByText("Search results")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Chicken breast, grilled")).toBeTruthy());
    expect(screen.getByText(/Estimated/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Log Chicken breast, grilled"));

    // Search closes/clears once an item is selected for logging.
    expect(screen.getByPlaceholderText("Or, search food by name...").props.value).toBe("");

    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        foodItemId: searchFood.id,
        servings: 1,
      }),
      expect.any(Object)
    );
  });

  it("opens a favorites-only state from the quick action without duplicating the list", () => {
    mockUseFavorites.mockReturnValue(successQuery({ items: [food] }));

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getAllByText("Favorites")[0]);

    expect(screen.getAllByText("Chicken breast, grilled")).toHaveLength(1);
  });

  it("opens the log sheet for a favorited item instead of logging it immediately", () => {
    const mutate = jest.fn();
    mockUseFavorites.mockReturnValue(successQuery({ items: [food] }));
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getAllByText("Favorites")[0]);
    fireEvent.press(screen.getAllByLabelText("Log Chicken breast, grilled")[0]);

    // Logging must not happen until the sheet's own "Log food" action is pressed.
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Log food")).toBeTruthy();

    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: food.id, servings: 1 }),
      expect.any(Object)
    );
  });

  it("shows favorited items with the filled heart state on the favorites screen", () => {
    mockUseFavorites.mockReturnValue(successQuery({ items: [food] }));
    act(() => {
      useFavoritesStore.setState({ favoriteIds: [food.id] });
    });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getAllByText("Favorites")[0]);

    expect(screen.getAllByLabelText("Remove favorite").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Add favorite")).toBeNull();
  });

  it("shows a filled heart and toggles off an already-favorited item", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);
    mockUseFavorites.mockReturnValue(successQuery({ items: [food] }));
    act(() => {
      useFavoritesStore.setState({ favoriteIds: [food.id] });
    });

    const screen = render(<LogFoodScreen />);

    fireEvent.press(screen.getAllByLabelText("Remove favorite")[0]);

    expect(toggleFavorite).toHaveBeenCalledWith(food.id);
    expect(screen.queryByText("Save changes")).toBeNull();
  });

  it("opens the edit sheet from a recent food row", () => {
    mockUseRecentFoods.mockReturnValue(successQuery({ items: [recentEntry] }));

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByLabelText("View Greek yogurt"));

    expect(screen.getByText("Save changes")).toBeTruthy();
  });

  it("resets to the food segment when the log tab is pressed", () => {
    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));

    expect(screen.getByText("Glass of water")).toBeTruthy();

    act(() => {
      emitTabRootReset("log");
    });

    expect(screen.queryByText("Glass of water")).toBeNull();
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("renders water progress and supports quick add/delete", () => {
    const add = jest.fn();
    const remove = jest.fn();
    mockUseAddWaterLog.mockReturnValue({ mutate: add, isPending: false });
    mockUseDeleteWaterLog.mockReturnValue({ mutate: remove });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));
    fireEvent.press(screen.getByLabelText("Add 250 ml water"));
    fireEvent.press(screen.getByLabelText("Delete water entry"));

    expect(screen.getByText(/980/)).toBeTruthy();
    expect(screen.getByText("Drink up")).toBeTruthy();
    expect(screen.getByText("Glass of water")).toBeTruthy();
    expect(add).toHaveBeenCalledWith(250, expect.any(Object));
    expect(remove).toHaveBeenCalledWith("water-1", expect.any(Object));
  });

  it("opens the water edit sheet for same-day entries", () => {
    const update = jest.fn();
    mockUseWater.mockReturnValue(successQuery({ ...water, day: localDay() }));
    mockUseUpdateWaterLog.mockReturnValue({ mutate: update, isPending: false, error: null });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));
    fireEvent.press(screen.getByLabelText("Edit water entry"));
    fireEvent.press(screen.getByText("Save changes"));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "water-1",
        amountMl: 250,
        recordedAt: water.entries[0].recordedAt,
      }),
      expect.any(Object)
    );
  });

  it("adds a custom amount from the manual water sheet", () => {
    const add = jest.fn();
    mockUseAddWaterLog.mockReturnValue({ mutate: add, isPending: false, error: null });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));
    fireEvent.press(screen.getByLabelText("Add water manually"));

    for (let i = 0; i < 3; i += 1) {
      fireEvent.press(screen.getByLabelText("Delete digit"));
    }
    fireEvent.press(screen.getByLabelText("Water amount 4"));
    fireEvent.press(screen.getByLabelText("Water amount 0"));
    fireEvent.press(screen.getByLabelText("Water amount 0"));
    fireEvent.press(screen.getByText("Add water"));

    expect(add).toHaveBeenCalledWith(400, expect.any(Object));
  });

  it("restates the water quick-add amounts when the unit system changes", () => {
    const settings: { data: { unitSystem: "metric" | "imperial" } } = {
      data: { unitSystem: "metric" },
    };
    mockUseSettings.mockImplementation(() => settings);

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));

    expect(screen.getByLabelText("Add 250 ml water")).toBeTruthy();

    settings.data.unitSystem = "imperial";
    screen.rerender(<LogFoodScreen />);

    expect(screen.getByLabelText("Add 8.5 fl oz water")).toBeTruthy();
    // The water segment keeps the Food Logs page title.
    expect(screen.getByText("Food Logs")).toBeTruthy();
  });
});
