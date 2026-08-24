import { act, fireEvent, render } from "@testing-library/react-native";
import type { FoodItem } from "@/contracts";
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

const mockUseEntitlement = jest.fn(() => ({ isPremium: true, isLoading: false }));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

jest.mock("@/lib", () => ({
  isNetworkReachable: jest.fn(async () => true),
  analytics: { track: jest.fn() },
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

describe("LogItemSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
  });

  it("logs a catalog item with foodItemId", () => {
    const mutate = jest.fn();
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: foodItem.id, servings: 1 }),
      expect.any(Object)
    );
  });

  it("shows scaled calories in the subtitle", () => {
    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );

    expect(screen.getByText("165 kcal")).toBeTruthy();
    expect(screen.getByText("Protein")).toBeTruthy();
  });

  it("gates macros behind PremiumGate for free users while keeping kcal visible", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );

    expect(screen.getByText("165 kcal")).toBeTruthy();
    expect(screen.getByText("Subscribe to see macros")).toBeTruthy();
    // The gate is a single frosted bar — the whole bar is the control, so there
    // is no separate "View plans" button to find.
    expect(screen.getByLabelText("Subscribe to see macros. View plans")).toBeTruthy();
  });

  it("shows ungated macro cards for premium users", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });

    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );

    expect(screen.getByText("Protein")).toBeTruthy();
    expect(screen.queryByText("Subscribe to see macros")).toBeNull();
  });

  it("resets quantity when switching to grams", () => {
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

  it("scales macros by grams (not quantity) when switching to a named serving", () => {
    // Reference is 100g/165kcal/31p/0c/4f; "1 cup, diced" = 140g, so 1x that
    // serving should scale by 140/100 = 1.4x, not by the raw quantity (1).
    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Unit"));
    fireEvent.press(screen.getByText("1 cup, diced"));

    expect(screen.getByDisplayValue("1")).toBeTruthy();
    expect(screen.getByText("231 kcal")).toBeTruthy();
    expect(screen.getByText("43.4g")).toBeTruthy(); // protein: 31 * 1.4
    expect(screen.getByText("5.6g")).toBeTruthy(); // fat: 4 * 1.4
  });

  it("scales macros by the typed gram amount, matching the server's per-100g math", () => {
    const screen = render(
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Unit"));
    fireEvent.press(screen.getByText("grams"));

    const gramsInput = screen.getByDisplayValue("100");
    fireEvent.changeText(gramsInput, "250");

    // 250g against a 100g reference = 2.5x: 165 * 2.5 = 412.5 -> rounds to 413.
    expect(screen.getByText("413 kcal")).toBeTruthy();
    expect(screen.getByText("77.5g")).toBeTruthy(); // protein: 31 * 2.5
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
      <LogItemSheet item={foodItem} day="2026-07-10" visible onClose={jest.fn()} />
    );
    fireEvent.press(screen.getByLabelText("Add favorite"));
    fireEvent.press(screen.getByText("Log food"));
    act(() => {
      onSuccess?.({ entry: { foodItemId: foodItem.id }, totals: {} });
    });

    expect(addFavorite).toHaveBeenCalledWith(foodItem.id, expect.any(Object));
    expect(useFavoritesStore.getState().favoriteIds).toEqual([foodItem.id]);
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
