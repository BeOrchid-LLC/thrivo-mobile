import { fireEvent, render } from "@testing-library/react-native";
import { LogFoodScreen } from "../screens/LogFoodScreen";

const mockUseFoodSearch = jest.fn();
const mockUseRecentFoods = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseLogFood = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseWater = jest.fn();
const mockUseAddWaterLog = jest.fn();
const mockUseDeleteWaterLog = jest.fn();
const mockUseEstimateFood = jest.fn();
const mockUseLogEstimate = jest.fn();
const mockUseBarcodeLookup = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useFoodSearch: (query: string) => mockUseFoodSearch(query),
  useRecentFoods: () => mockUseRecentFoods(),
  useFavorites: () => mockUseFavorites(),
  useLogFood: () => mockUseLogFood(),
  useAddFavorite: () => mockUseAddFavorite(),
  useWater: () => mockUseWater(),
  useAddWaterLog: () => mockUseAddWaterLog(),
  useDeleteWaterLog: () => mockUseDeleteWaterLog(),
  useEstimateFood: () => mockUseEstimateFood(),
  useLogEstimate: () => mockUseLogEstimate(),
  useBarcodeLookup: (barcode: string | null) => mockUseBarcodeLookup(barcode),
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

describe("LogFoodScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFoodSearch.mockReturnValue(successQuery({ items: [] }));
    mockUseRecentFoods.mockReturnValue(successQuery({ items: [] }));
    mockUseFavorites.mockReturnValue(successQuery({ items: [] }));
    mockUseLogFood.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseWater.mockReturnValue(successQuery({ water }));
    mockUseAddWaterLog.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseDeleteWaterLog.mockReturnValue({ mutate: jest.fn() });
    mockUseEstimateFood.mockReturnValue({ mutate: jest.fn(), isPending: false, data: undefined });
    mockUseLogEstimate.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food: null }));
  });

  it("renders the empty food state", () => {
    const screen = render(<LogFoodScreen />);

    expect(screen.getByText("Log Food")).toBeTruthy();
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
  });

  it("shows search results and logs a selected food", () => {
    const mutate = jest.fn();
    mockUseFoodSearch.mockReturnValue(successQuery({ items: [food] }));
    mockUseLogFood.mockReturnValue({ mutate, isPending: false });

    const screen = render(<LogFoodScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Or, search by name..."), "Chic");
    fireEvent.press(screen.getByLabelText("Log food"));

    expect(screen.getByText("Chicken breast, grilled")).toBeTruthy();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: "food-1", servings: 1 })
    );
  });

  it("estimates a described meal", () => {
    const mutate = jest.fn();
    mockUseEstimateFood.mockReturnValue({ mutate, isPending: false, data: undefined });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Describe it"));
    fireEvent.press(screen.getByText("Estimate"));

    expect(screen.getByText(/Describe a meal/)).toBeTruthy();
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ portionMeasure: "weight" }));
  });

  it("renders water progress and supports quick add/delete", () => {
    const add = jest.fn();
    const remove = jest.fn();
    mockUseAddWaterLog.mockReturnValue({ mutate: add, isPending: false });
    mockUseDeleteWaterLog.mockReturnValue({ mutate: remove });

    const screen = render(<LogFoodScreen />);
    fireEvent.press(screen.getByText("Water"));
    fireEvent.press(screen.getAllByText("250")[0]);
    fireEvent.press(screen.getByLabelText("Delete water entry"));

    expect(screen.getByText(/980/)).toBeTruthy();
    expect(screen.getByText("Drink up")).toBeTruthy();
    expect(add).toHaveBeenCalledWith(250);
    expect(remove).toHaveBeenCalledWith("water-1");
  });
});
