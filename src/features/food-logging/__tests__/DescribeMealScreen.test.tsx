import { fireEvent, render } from "@testing-library/react-native";
import { DescribeMealScreen } from "../screens/DescribeMealScreen";

const mockUseEstimateFood = jest.fn();
const mockUseLogEstimate = jest.fn();

jest.mock("@/lib", () => ({
  isNetworkReachable: jest.fn(async () => true),
  analytics: { track: jest.fn() },
}));

jest.mock("../hooks/useFoodLogging", () => ({
  useEstimateFood: () => mockUseEstimateFood(),
  useLogEstimate: () => mockUseLogEstimate(),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ isPremium: true, isLoading: false }),
}));

const estimate = {
  nutrients: { calories: 320, proteinG: 22, carbsG: 30, fatG: 11 },
  referenceGrams: 150,
  servingUnit: "g",
};

const renderScreen = (onLogged: () => void = jest.fn()) =>
  render(<DescribeMealScreen day="2026-06-21" onBack={jest.fn()} onLogged={onLogged} />);

describe("DescribeMealScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEstimateFood.mockReturnValue({ mutate: jest.fn(), isPending: false, data: undefined });
    mockUseLogEstimate.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("estimates a described meal", () => {
    const mutate = jest.fn();
    mockUseEstimateFood.mockReturnValue({ mutate, isPending: false, data: undefined });

    const screen = renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("Chicken breast, grilled"), "Greek yoghurt");
    fireEvent.press(screen.getByText("Estimate"));

    expect(screen.getByText(/Describe a meal/)).toBeTruthy();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Greek yoghurt", portionMeasure: "weight" }),
      expect.any(Object)
    );
  });

  it("resets the quantity to a per-unit default when the portion measure changes", () => {
    const screen = renderScreen();

    // Default measure is "weight", default quantity "150".
    expect(screen.getByDisplayValue("150")).toBeTruthy();

    fireEvent.press(screen.getByText("Serving"));
    expect(screen.getByDisplayValue("1")).toBeTruthy();

    fireEvent.press(screen.getByText("Weight"));
    expect(screen.getByDisplayValue("100")).toBeTruthy();
  });

  it("pins the log action once there is an estimate to log", () => {
    const mutate = jest.fn();
    mockUseEstimateFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      data: { estimate },
    });
    mockUseLogEstimate.mockReturnValue({ mutate, isPending: false });

    const screen = renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText("Chicken breast, grilled"), "Greek yoghurt");

    // Estimating again stays available beside the primary log action.
    expect(screen.getByText("Estimate again")).toBeTruthy();
    fireEvent.press(screen.getByText("Log estimate"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Greek yoghurt",
        day: "2026-06-21",
        nutrients: estimate.nutrients,
      }),
      expect.any(Object)
    );
  });

  it("leaves for the food tracker once the estimate is logged", () => {
    const mutate = jest.fn();
    const onLogged = jest.fn();
    mockUseEstimateFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      data: { estimate },
    });
    mockUseLogEstimate.mockReturnValue({ mutate, isPending: false });

    const screen = renderScreen(onLogged);
    fireEvent.changeText(screen.getByPlaceholderText("Chicken breast, grilled"), "Greek yoghurt");
    fireEvent.press(screen.getByText("Log estimate"));

    expect(onLogged).not.toHaveBeenCalled();
    mutate.mock.calls[0][1].onSuccess();
    expect(onLogged).toHaveBeenCalledTimes(1);
  });
});
