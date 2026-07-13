import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FoodItem } from "@/contracts";
import { useFoodDetail } from "../hooks/useFoodLogging";

const mockGetFoodDetail = jest.fn();
jest.mock("../api/food-logging.api", () => ({
  getFoodDetail: (id: string) => mockGetFoodDetail(id),
}));

const foodItem: FoodItem = {
  id: "food-1",
  name: "Oatmeal",
  brand: null,
  barcode: null,
  source: "authoritative",
  servingLabel: "1 serving",
  servingGrams: 100,
  nutrients: { calories: 200, proteinG: 10, carbsG: 20, fatG: 5 },
  servingOptions: [],
  isPersonal: false,
  isEstimated: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useFoodDetail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches the food when enabled with an id", async () => {
    mockGetFoodDetail.mockResolvedValue(foodItem);

    const { result } = renderHook(() => useFoodDetail("food-1", true), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetFoodDetail).toHaveBeenCalledWith("food-1");
    expect(result.current.data).toEqual(foodItem);
  });

  it("does not fetch when disabled, even with an id present", () => {
    renderHook(() => useFoodDetail("food-1", false), { wrapper });
    expect(mockGetFoodDetail).not.toHaveBeenCalled();
  });

  it("does not fetch when there is no foodItemId, even if enabled", () => {
    renderHook(() => useFoodDetail(null, true), { wrapper });
    expect(mockGetFoodDetail).not.toHaveBeenCalled();
  });
});
