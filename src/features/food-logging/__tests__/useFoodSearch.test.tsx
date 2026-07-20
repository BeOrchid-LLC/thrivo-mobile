import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { useFoodSearch } from "../hooks/useFoodLogging";

const mockSearchFoods = jest.fn();

jest.mock("../api/food-logging.api", () => ({
  searchFoods: (...args: unknown[]) => mockSearchFoods(...args),
  lookupFood: jest.fn(),
  getFoodDetail: jest.fn(),
  getFavorites: jest.fn(),
  getFoodLogDay: jest.fn(),
  getRecentFoods: jest.fn(),
  getWater: jest.fn(),
  getWaterHistory: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  estimateFood: jest.fn(),
  logEstimate: jest.fn(),
  logFood: jest.fn(),
  updateFoodLog: jest.fn(),
  deleteFoodLog: jest.fn(),
  addWater: jest.fn(),
  updateWater: jest.fn(),
  deleteWater: jest.fn(),
  createFood: jest.fn(),
  updateFood: jest.fn(),
}));

jest.mock("@/api", () => {
  const actual = jest.requireActual("@/api");
  return {
    ...actual,
    useOfflineWrite: () => ({ mutate: jest.fn(), isPending: false }),
    invalidateFoodLogViews: jest.fn(),
    invalidateWaterViews: jest.fn(),
  };
});

function Harness({ query }: { query: string }) {
  const search = useFoodSearch(query);
  return <Text testID="count">{String(search.items.length)}</Text>;
}

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("useFoodSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-fetches the external page when the first local page is empty", async () => {
    mockSearchFoods
      .mockResolvedValueOnce({
        items: [],
        nextCursor: "external:1",
        phase: "local",
        cached: false,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "food-1",
            name: "Oats",
            brand: null,
            barcode: null,
            source: "authoritative",
            servingLabel: "40g",
            servingGrams: 40,
            nutrients: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3 },
            servingOptions: [],
            isPersonal: false,
            isEstimated: false,
          },
        ],
        nextCursor: null,
        phase: "external",
        cached: false,
      });

    const screen = render(wrap(<Harness query="oa" />));

    await waitFor(() => expect(screen.getByTestId("count").props.children).toBe("1"));
    expect(mockSearchFoods).toHaveBeenCalledTimes(2);
    expect(mockSearchFoods).toHaveBeenNthCalledWith(1, "oa", {
      limit: 10,
      cursor: null,
    });
    expect(mockSearchFoods).toHaveBeenNthCalledWith(2, "oa", {
      limit: 10,
      cursor: "external:1",
    });
  });
  it("fetches external results after a short local page and deduplicates ids", async () => {
    const local = {
      id: "food-1",
      name: "Oats",
      brand: null,
      barcode: null,
      source: "authoritative",
      servingLabel: "40g",
      servingGrams: 40,
      nutrients: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3 },
      servingOptions: [],
      isPersonal: false,
      isEstimated: false,
    };
    mockSearchFoods
      .mockResolvedValueOnce({
        items: [local],
        nextCursor: "external:1",
        phase: "local",
        cached: false,
      })
      .mockResolvedValueOnce({
        items: [local, { ...local, id: "food-2", name: "Oat milk" }],
        nextCursor: null,
        phase: "external",
        cached: false,
      });

    const screen = render(wrap(<Harness query="oat" />));

    await waitFor(() => expect(screen.getByTestId("count").props.children).toBe("2"));
    expect(mockSearchFoods).toHaveBeenCalledTimes(2);
  });
});
