import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { FoodLogEntry } from "@/contracts";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";

const mockUseUpdateFoodLog = jest.fn();
const mockUseDeleteFoodLog = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useUpdateFoodLog: () => mockUseUpdateFoodLog(),
  useDeleteFoodLog: () => mockUseDeleteFoodLog(),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

const entry: FoodLogEntry = {
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

describe("EditFoodLogSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
