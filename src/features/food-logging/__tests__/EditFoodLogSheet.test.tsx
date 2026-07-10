import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { FoodLogEntry } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { localDay } from "@/utils";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";

const mockUseUpdateFoodLog = jest.fn();
const mockUseDeleteFoodLog = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseToggleFavorite = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useUpdateFoodLog: () => mockUseUpdateFoodLog(),
  useDeleteFoodLog: () => mockUseDeleteFoodLog(),
  useFavorites: () => mockUseFavorites(),
  useToggleFavorite: () => mockUseToggleFavorite(),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

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
});
