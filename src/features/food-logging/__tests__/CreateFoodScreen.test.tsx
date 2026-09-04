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

    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={jest.fn()} />
    );
    fireEvent.press(screen.getByText("Save food"));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Add a food name.")).toBeTruthy();
    expect(screen.getByText("Add the calories per serving.")).toBeTruthy();
  });

  it("creates the food with blank macros saved as zero", () => {
    const mutate = jest.fn();
    mockUseCreateFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={jest.fn()} />
    );
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

  it("keeps what was typed in a number field and says what is wrong with it", () => {
    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={jest.fn()} />
    );
    const calories = screen.getByLabelText("Calories");

    // The keypad is only a hint, so the field explains rather than silently
    // rewriting the entry the way the onboarding number fields do.
    fireEvent.changeText(calories, "12abc3");
    expect(screen.getByLabelText("Calories").props.value).toBe("12abc3");
    expect(screen.getByText("Numbers only")).toBeTruthy();

    fireEvent.changeText(calories, "5001");
    expect(screen.getByText("Enter 0\u20135000 kcal")).toBeTruthy();

    fireEvent.changeText(calories, "420");
    expect(screen.queryByText("Numbers only")).toBeNull();
    expect(screen.queryByText("Enter 0\u20135000 kcal")).toBeNull();
  });

  it("says nothing about an untouched number field", () => {
    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={jest.fn()} />
    );

    expect(screen.queryByText("Numbers only")).toBeNull();
    expect(screen.queryByText("Add the calories per serving.")).toBeNull();
  });

  it("opens the log sheet on the food it just created", () => {
    const mutate = jest.fn((_payload, options) => options.onSuccess({ food: createdFood }));
    mockUseCreateFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={jest.fn()} />
    );
    fillValidForm(screen);
    fireEvent.press(screen.getByText("Save food"));

    expect(screen.getByText("Jollof rice")).toBeTruthy();
    expect(screen.getByText("Log food")).toBeTruthy();
  });

  it("hands back to the food tracker once the created food is logged", () => {
    const createMutate = jest.fn((_payload, options) => options.onSuccess({ food: createdFood }));
    mockUseCreateFood.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn((_payload, options) => options.onSuccess({ entry: { foodItemId: null } })),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    const onLogged = jest.fn();

    const screen = render(
      <CreateFoodScreen day="2026-06-21" onBack={jest.fn()} onLogged={onLogged} />
    );
    fillValidForm(screen);
    fireEvent.press(screen.getByText("Save food"));
    fireEvent.press(screen.getByText("Log food"));

    expect(onLogged).toHaveBeenCalled();
  });
});
