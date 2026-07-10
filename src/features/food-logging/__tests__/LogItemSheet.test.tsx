import { fireEvent, render } from "@testing-library/react-native";
import type { FoodItem, FoodSearchResult } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { LogItemSheet } from "../components/LogItemSheet";

const mockUseLogFood = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseFavorites = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useLogFood: () => mockUseLogFood(),
  useAddFavorite: () => mockUseAddFavorite(),
  useFavorites: () => mockUseFavorites(),
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
  servingOptions: [],
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
    onSuccess?.({ entry: { foodItemId: "resolved-food-1" }, totals: {} });

    expect(addFavorite).toHaveBeenCalledWith("resolved-food-1");
  });
});
