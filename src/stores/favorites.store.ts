import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FavoritesState {
  favoriteIds: string[];
  hasHydrated: boolean;
  actions: {
    setFavoriteIds: (ids: string[]) => void;
    applyFavoriteStatuses: (
      statuses: { id: string | null | undefined; isFavorite: boolean }[]
    ) => void;
    addFavoriteId: (id: string) => void;
    removeFavoriteId: (id: string) => void;
    setHasHydrated: (hasHydrated: boolean) => void;
    reset: () => void;
  };
}

/**
 * Device-local mirror of the server's favorited food items. Kept in sync
 * whenever `useFavorites()` fetches successfully, and updated optimistically
 * by `useToggleFavorite()` so every screen reflects a toggle instantly
 * without waiting on its own query refetch. Persisted so favorite state
 * survives an app restart even before the query re-fetches.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      favoriteIds: [],
      hasHydrated: false,
      actions: {
        setFavoriteIds: (favoriteIds) => set({ favoriteIds }),
        applyFavoriteStatuses: (statuses) =>
          set((state) => {
            const next = new Set(state.favoriteIds);
            for (const status of statuses) {
              if (!status.id) continue;
              if (status.isFavorite) next.add(status.id);
              else next.delete(status.id);
            }
            return { favoriteIds: Array.from(next) };
          }),
        addFavoriteId: (id) =>
          set((state) => ({
            favoriteIds: state.favoriteIds.includes(id)
              ? state.favoriteIds
              : [...state.favoriteIds, id],
          })),
        removeFavoriteId: (id) =>
          set((state) => ({
            favoriteIds: state.favoriteIds.filter((existing) => existing !== id),
          })),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        reset: () => set({ favoriteIds: [] }),
      },
    }),
    {
      name: "thrivo.favorites",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favoriteIds: state.favoriteIds }),
      onRehydrateStorage: () => (state) => {
        state?.actions.setHasHydrated(true);
      },
    }
  )
);

export const useFavoriteIds = () => useFavoritesStore((s) => s.favoriteIds);
export const useIsFavorite = (foodItemId: string | null | undefined) =>
  useFavoritesStore((s) => Boolean(foodItemId) && s.favoriteIds.includes(foodItemId as string));
export const useFavoritesHydrated = () => useFavoritesStore((s) => s.hasHydrated);
export const useFavoritesActions = () => useFavoritesStore((s) => s.actions);
