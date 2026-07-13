import { act, fireEvent, render } from "@testing-library/react-native";
import type { FoodItem, FoodSearchResult } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { LogItemSheet } from "../components/LogItemSheet";

const mockUseLogFood = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseRemoveFavorite = jest.fn();
const mockUseFavorites = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useLogFood: () => mockUseLogFood(),
  useAddFavorite: () => mockUseAddFavorite(),
  useRemoveFavorite: () => mockUseRemoveFavorite(),
  useFavorites: () => mockUseFavorites(),
}));

jest.mock("@/lib", () => ({
  isNetworkReachable: jest.fn(async () => true),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

const foodItem: FoodItem = {
  id: "food-1",
  name: "Chicken breast, grilled",
  brand: null,
  barcode: null,
  source: "authoritative",
  servingLabel: "100g",
  servingGrams: 100,
  nutrients: { calories: 165, proteinG: 31, carbsG: 0, fatG: 4 },
  servingOptions: [
    { id: null, measure: "serving", label: "100g", grams: 100, isDefault: true },
    { id: "grams", measure: "weight", label: "grams", grams: 1, isDefault: false },
    { id: "serving-cup", measure: "cup", label: "1 cup, diced", grams: 140, isDefault: false },
  ],
  isPersonal: false,
  isEstimated: false,
};

const searchResult: FoodSearchResult = {
  externalId: "off:123",
  name: "Greek yogurt",
  brand: null,
  barcode: "123",
  servingLabel: "100g",
  servingGrams: 100,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  source: "openfoodfacts",
};

describe("LogItemSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
  });

  it("renders nothing when there is no item", () => {
    const screen = render(
      <LogItemSheet item={null} day="2026-07-10" visible={false} onClose={jest.fn()} />
    );
    expect(screen.toJSON()).toBeNull();
  });

  it("logs a catalog item with the entered servings", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("+"));
    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: foodItem.id, day: "2026-07-10", servings: 2 }),
      expect.any(Object)
    );
  });

  it("logs fractional servings", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.changeText(screen.getByDisplayValue("1"), "0.5");
    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: foodItem.id, day: "2026-07-10", servings: 0.5 }),
      expect.any(Object)
    );
  });

  it("resets quantity to 1 and sends the chosen servingId when switching to a named unit", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("+")); // servings: 1 -> 2, to prove the switch resets it
    fireEvent.press(screen.getByText("Unit"));
    fireEvent.press(screen.getByText("1 cup, diced"));

    expect(screen.getByDisplayValue("1")).toBeTruthy();

    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        foodItemId: foodItem.id,
        servings: 1,
        servingId: "serving-cup",
        servingUnit: "1 cup, diced",
      }),
      expect.any(Object)
    );
  });

  it("resets quantity to the food's reference grams when switching to the grams unit", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Unit"));
    fireEvent.press(screen.getByText("grams"));

    expect(screen.getByDisplayValue("100")).toBeTruthy();

    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ servings: 100, servingId: "grams", servingUnit: "grams" }),
      expect.any(Object)
    );
  });

  it("logs a raw search result as externalFood", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={searchResult} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ externalFood: searchResult, servings: 1 }),
      expect.any(Object)
    );
  });

  it("favorites the item after a successful log when checked", () => {
    const addFavorite = jest.fn();
    mockUseAddFavorite.mockReturnValue({ mutate: addFavorite });
    let onSuccess: ((data: unknown) => void) | undefined;
    mockUseLogFood.mockReturnValue({
      mutate: (_vars: unknown, opts: { onSuccess: (data: unknown) => void }) => {
        onSuccess = opts.onSuccess;
      },
      isPending: false,
      error: null,
      reset: jest.fn(),
    });

    const screen = render(
      <LogItemSheet item={searchResult} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByLabelText("Add favorite"));
    fireEvent.press(screen.getByText("Log food"));
    act(() => {
      onSuccess?.({ entry: { foodItemId: "resolved-food-1" }, totals: {} });
    });

    expect(addFavorite).toHaveBeenCalledWith("resolved-food-1", expect.any(Object));
    expect(useFavoritesStore.getState().favoriteIds).toEqual(["resolved-food-1"]);
  });

  it("removes a catalog favorite after a successful log when unchecked", () => {
    const removeFavorite = jest.fn();
    mockUseRemoveFavorite.mockReturnValue({ mutate: removeFavorite });
    useFavoritesStore.setState({ favoriteIds: [foodItem.id] });
    let onSuccess: ((data: unknown) => void) | undefined;
    mockUseLogFood.mockReturnValue({
      mutate: (_vars: unknown, opts: { onSuccess: (data: unknown) => void }) => {
        onSuccess = opts.onSuccess;
      },
      isPending: false,
      error: null,
      reset: jest.fn(),
    });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByLabelText("Remove favorite"));
    fireEvent.press(screen.getByText("Log food"));
    act(() => {
      onSuccess?.({ entry: { foodItemId: foodItem.id }, totals: {} });
    });

    expect(removeFavorite).toHaveBeenCalledWith(foodItem.id, expect.any(Object));
    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });
});
