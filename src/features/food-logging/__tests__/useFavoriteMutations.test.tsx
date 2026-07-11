import { createElement, type ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { FavoritesListResponse, FoodItem } from "@/contracts";
import { useAddFavorite, useRemoveFavorite } from "../hooks/useFoodLogging";

const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
jest.mock("../api/food-logging.api", () => ({
  addFavorite: (payload: unknown) => mockAddFavorite(payload),
  removeFavorite: (id: string) => mockRemoveFavorite(id),
}));

function foodItem(overrides: Partial<FoodItem> & Pick<FoodItem, "id">): FoodItem {
  return {
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
    ...overrides,
  } as FoodItem;
}

function setup(initial: FavoritesListResponse) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(queryKeys.foods.favorites(), initial);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe("useAddFavorite / useRemoveFavorite cache patch (R5-1)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("prepends the returned item into the cached favorites list on add", async () => {
    const existing = foodItem({ id: "a" });
    const added = foodItem({ id: "b", name: "Rice" });
    mockAddFavorite.mockResolvedValue({ item: added });
    const { queryClient, wrapper } = setup({ items: [existing] });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    act(() => result.current.mutate("b"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<FavoritesListResponse>(queryKeys.foods.favorites());
    expect(cached?.items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("de-dupes when re-adding an item already in the cache, moving it to the front", async () => {
    const a = foodItem({ id: "a" });
    const b = foodItem({ id: "b" });
    mockAddFavorite.mockResolvedValue({ item: b });
    const { queryClient, wrapper } = setup({ items: [a, b] });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    act(() => result.current.mutate("b"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<FavoritesListResponse>(queryKeys.foods.favorites());
    expect(cached?.items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("does not touch the cache when the mutation response has no item (nothing to add)", async () => {
    mockAddFavorite.mockResolvedValue({ item: null });
    const existing = foodItem({ id: "a" });
    const { queryClient, wrapper } = setup({ items: [existing] });

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    act(() => result.current.mutate("missing"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<FavoritesListResponse>(queryKeys.foods.favorites());
    expect(cached?.items.map((i) => i.id)).toEqual(["a"]);
  });

  it("removes the item by id from the cached favorites list on remove", async () => {
    mockRemoveFavorite.mockResolvedValue({ item: foodItem({ id: "a" }) });
    const a = foodItem({ id: "a" });
    const b = foodItem({ id: "b" });
    const { queryClient, wrapper } = setup({ items: [a, b] });

    const { result } = renderHook(() => useRemoveFavorite(), { wrapper });
    act(() => result.current.mutate("a"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<FavoritesListResponse>(queryKeys.foods.favorites());
    expect(cached?.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("leaves an unpopulated cache alone (no list query has run yet)", async () => {
    mockAddFavorite.mockResolvedValue({ item: foodItem({ id: "a" }) });
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAddFavorite(), { wrapper });
    act(() => result.current.mutate("a"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(queryKeys.foods.favorites())).toBeUndefined();
  });
});
