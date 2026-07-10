import { renderHook } from "@testing-library/react-native";
import { useFavoriteIds, useFavoritesStore, useIsFavorite } from "../favorites.store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe("favorites store", () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoriteIds: [] });
  });

  it("defaults to no favorited ids", () => {
    const { result } = renderHook(() => useFavoriteIds());

    expect(result.current).toEqual([]);
  });

  it("adds an id without duplicating it", () => {
    useFavoritesStore.getState().actions.addFavoriteId("food-1");
    useFavoritesStore.getState().actions.addFavoriteId("food-1");

    expect(useFavoritesStore.getState().favoriteIds).toEqual(["food-1"]);
  });

  it("removes an id", () => {
    useFavoritesStore.setState({ favoriteIds: ["food-1", "food-2"] });

    useFavoritesStore.getState().actions.removeFavoriteId("food-1");

    expect(useFavoritesStore.getState().favoriteIds).toEqual(["food-2"]);
  });

  it("replaces the full id list", () => {
    useFavoritesStore.getState().actions.setFavoriteIds(["a", "b", "c"]);

    expect(useFavoritesStore.getState().favoriteIds).toEqual(["a", "b", "c"]);
  });

  it("useIsFavorite reflects membership and treats null/undefined as not favorited", () => {
    useFavoritesStore.setState({ favoriteIds: ["food-1"] });

    const { result: favorited } = renderHook(() => useIsFavorite("food-1"));
    const { result: notFavorited } = renderHook(() => useIsFavorite("food-2"));
    const { result: nullId } = renderHook(() => useIsFavorite(null));

    expect(favorited.current).toBe(true);
    expect(notFavorited.current).toBe(false);
    expect(nullId.current).toBe(false);
  });
});
