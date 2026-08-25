import { fireEvent, render } from "@testing-library/react-native";
import type { FoodItem } from "@/contracts";
import { useFavoritesStore } from "@/stores";
import { CreateFoodScreen } from "../screens/CreateFoodScreen";

const mockUseCreateFood = jest.fn();
const mockUseLogFood = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseRemoveFavorite = jest.fn();
const mockUseFavorites = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useCreateFood: () => mockUseCreateFood(),
  useLogFood: () => mockUseLogFood(),
  useAddFavorite: () => mockUseAddFavorite(),
  useRemoveFavorite: () => mockUseRemoveFavorite(),
  useFavorites: () => mockUseFavorites(),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ isPremium: true, isLoading: false }),
}));

jest.mock("@/lib", () => ({
  isNetworkReachable: jest.fn(async () => true),
  analytics: { track: jest.fn() },
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

const createdFood: FoodItem = {
  id: "food-new",
  name: "Jollof rice",
  brand: null,
  barcode: null,
  source: "personal",
  servingLabel: "1 bowl",
  servingGrams: 250,
  nutrients: { calories: 420, proteinG: 12, carbsG: 60, fatG: 14 },
  servingOptions: [{ id: null, measure: "serving", label: "1 bowl", grams: 250, isDefault: true }],
  isPersonal: true,
  isEstimated: false,
  isFavorite: false,
};

function fillValidForm(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText("Name of food"), "Jollof rice");
  fireEvent.changeText(screen.getByLabelText("One serving is"), "1 bowl");
  fireEvent.changeText(screen.getByLabelText("Calories"), "420");
}

describe("CreateFoodScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    mockUseFavorites.mockReturnValue({ data: { items: [] } });
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseCreateFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
  });

  it("shows validation errors and sends nothing when the form is empty", () => {
    const mutate = jest.fn();
    mockUseCreateFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(<CreateFoodScreen day="2026-06-21" onBack={jest.fn()} />);
    fireEvent.press(screen.getByText("Save food"));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Add a food name.")).toBeTruthy();
    expect(screen.getByText("Add the calories per serving.")).toBeTruthy();
  });

  it("creates the food with blank macros saved as zero", () => {
    const mutate = jest.fn();
    mockUseCreateFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(<CreateFoodScreen day="2026-06-21" onBack={jest.fn()} />);
    fillValidForm(screen);
    fireEvent.press(screen.getByText("Save food"));

    expect(mutate).toHaveBeenCalledWith(
      {
        name: "Jollof rice",
        brand: undefined,
        servingLabel: "1 bowl",
        servingGrams: undefined,
        nutrients: { calories: 420, proteinG: 0, carbsG: 0, fatG: 0 },
      },
      expect.any(Object)
    );
  });

  it("keeps letters out of the number fields", () => {
    const screen = render(<CreateFoodScreen day="2026-06-21" onBack={jest.fn()} />);
    const calories = screen.getByLabelText("Calories");

    fireEvent.changeText(calories, "sdf");
    expect(calories.props.value).toBe("");

    fireEvent.changeText(calories, "12abc3");
    expect(calories.props.value).toBe("123");

    fireEvent.changeText(screen.getByLabelText("Protein"), "1,5");
    expect(screen.getByLabelText("Protein").props.value).toBe("1.5");
  });

  it("opens the log sheet on the food it just created", () => {
    const mutate = jest.fn((_payload, options) => options.onSuccess({ food: createdFood }));
    mockUseCreateFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(<CreateFoodScreen day="2026-06-21" onBack={jest.fn()} />);
    fillValidForm(screen);
    fireEvent.press(screen.getByText("Save food"));

    expect(screen.getByText("Jollof rice")).toBeTruthy();
    expect(screen.getByText("Log food")).toBeTruthy();
  });
});
