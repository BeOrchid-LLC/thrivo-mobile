import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { FoodItem, FoodLogEntry } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { localDay } from "@/utils";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";

const mockUseUpdateFoodLog = jest.fn();
const mockUseDeleteFoodLog = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseToggleFavorite = jest.fn();
const mockUseFoodDetail = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useUpdateFoodLog: () => mockUseUpdateFoodLog(),
  useDeleteFoodLog: () => mockUseDeleteFoodLog(),
  useFavorites: () => mockUseFavorites(),
  useToggleFavorite: () => mockUseToggleFavorite(),
  useFoodDetail: (...args: unknown[]) => mockUseFoodDetail(...args),
}));

const mockUseEntitlement = jest.fn(() => ({ isPremium: true, isLoading: false }));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => mockUseEntitlement(),
}));

const entry: FoodLogEntry = {
  id: "entry-1",
  foodItemId: "food-1",
  name: "Greek yogurt",
  day: localDay(),
  servings: 1,
  servingUnit: null,
  source: "search",
  barcode: null,
  isEstimated: false,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  consumedAt: new Date().toISOString(),
  loggedAt: new Date().toISOString(),
};

const oldEntry: FoodLogEntry = { ...entry, id: "entry-2", day: "2020-01-01" };

const foodItem: FoodItem = {
  id: "food-1",
  name: "Greek yogurt",
  brand: null,
  barcode: null,
  source: "authoritative",
  servingLabel: "1 serving",
  servingGrams: 170,
  nutrients: { calories: 120, proteinG: 18, carbsG: 8, fatG: 2 },
  servingOptions: [
    { id: null, measure: "serving", label: "1 serving", grams: 170, isDefault: true },
    { id: "grams", measure: "weight", label: "grams", grams: 1, isDefault: false },
    { id: "serving-cup", measure: "cup", label: "1 cup", grams: 245, isDefault: false },
  ],
  isPersonal: false,
  isEstimated: false,
};

describe("EditFoodLogSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
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
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: false });
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });
  });

  it("renders nothing when there is no entry", () => {
    const screen = render(<EditFoodLogSheet entry={null} visible={false} onClose={jest.fn()} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("seeds the servings stepper from the entry and saves the change", () => {
    const mutate = jest.fn();
    mockUseUpdateFoodLog.mockReturnValue({
      mutate,
      isPending: false,
      error: null,
      reset: jest.fn(),
    });

    const screen = render(<EditFoodLogSheet entry={entry} visible onClose={jest.fn()} />);

    expect(screen.getByDisplayValue("1")).toBeTruthy();
    fireEvent.press(screen.getByText("+"));
    expect(screen.getByDisplayValue("2")).toBeTruthy();

    fireEvent.press(screen.getByText("Save changes"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: entry.id, servings: 2 }),
      expect.any(Object)
    );
  });

  it("offers a unit switcher seeded from the saved label and resets quantity on switch", () => {
    const mutate = jest.fn();
    mockUseUpdateFoodLog.mockReturnValue({
      mutate,
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseFoodDetail.mockReturnValue({ data: foodItem, isLoading: false });
    const cupEntry: FoodLogEntry = { ...entry, servingUnit: "1 cup" };

    const screen = render(<EditFoodLogSheet entry={cupEntry} visible onClose={jest.fn()} />);

    // Best-effort matched against the saved "1 cup" label.
    expect(screen.getByText("1 cup")).toBeTruthy();

    fireEvent.press(screen.getByText("Unit"));
    fireEvent.press(screen.getByText("grams"));

    expect(screen.getByDisplayValue("170")).toBeTruthy();

    fireEvent.press(screen.getByText("Save changes"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: cupEntry.id,
        servings: 170,
        servingId: "grams",
        servingUnit: "grams",
      }),
      expect.any(Object)
    );
  });

  it("does not fetch food detail for historical (non-editable) entries", () => {
    render(<EditFoodLogSheet entry={oldEntry} visible onClose={jest.fn()} />);
    expect(mockUseFoodDetail).toHaveBeenCalledWith(oldEntry.foodItemId, false);
  });

  it("asks for confirmation and deletes the entry", () => {
    const mutate = jest.fn();
    mockUseDeleteFoodLog.mockReturnValue({
      mutate,
      isPending: false,
      error: null,
      reset: jest.fn(),
    });

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    const screen = render(<EditFoodLogSheet entry={entry} visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("Delete entry"));

    const [, , buttons] = alertSpy.mock.calls[0];
    buttons?.find((b) => b.text === "Delete")?.onPress?.();

    expect(mutate).toHaveBeenCalledWith(entry.id, expect.any(Object));
  });

  it("toggles favorite from the sheet header", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);

    const screen = render(<EditFoodLogSheet entry={entry} visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("Add favorite"));

    expect(toggleFavorite).toHaveBeenCalledWith(entry.foodItemId);
  });

  it("restricts non-today entries to favorite-only, no edit/delete", () => {
    const screen = render(<EditFoodLogSheet entry={oldEntry} visible onClose={jest.fn()} />);

    expect(screen.queryByText("Save changes")).toBeNull();
    expect(screen.queryByLabelText("Delete entry")).toBeNull();
    expect(screen.getByText(/Editing is only available for entries logged today/)).toBeTruthy();
    expect(screen.getByLabelText("Add favorite")).toBeTruthy();
  });

  it("gates macros behind PremiumGate for free users while keeping kcal visible", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: false, isLoading: false });

    const screen = render(<EditFoodLogSheet entry={entry} visible onClose={jest.fn()} />);

    expect(screen.getByText("120 kcal")).toBeTruthy();
    expect(screen.getByText("Subscribe to see macros")).toBeTruthy();
    expect(screen.getByText("View plans")).toBeTruthy();
  });

  it("shows ungated macro cards for premium users", () => {
    mockUseEntitlement.mockReturnValue({ isPremium: true, isLoading: false });

    const screen = render(<EditFoodLogSheet entry={entry} visible onClose={jest.fn()} />);

    expect(screen.getByText("Protein")).toBeTruthy();
    expect(screen.queryByText("Subscribe to see macros")).toBeNull();
  });
});
