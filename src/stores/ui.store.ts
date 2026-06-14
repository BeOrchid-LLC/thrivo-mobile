import { create } from "zustand";
import type { MealType } from "@/contracts";

/**
 * Transient, device-local UI state (MOBILE_ARCHITECTURE §4.2): things like the
 * active meal tab on the log screen or which bottom sheet is open. Never server
 * data.
 */
interface UiState {
  activeMeal: MealType;
  /** Identifier of the currently-open bottom sheet, or null. */
  activeSheet: string | null;
  actions: {
    setActiveMeal: (meal: MealType) => void;
    openSheet: (id: string) => void;
    closeSheet: () => void;
  };
}

export const useUiStore = create<UiState>((set) => ({
  activeMeal: "breakfast",
  activeSheet: null,
  actions: {
    setActiveMeal: (activeMeal) => set({ activeMeal }),
    openSheet: (activeSheet) => set({ activeSheet }),
    closeSheet: () => set({ activeSheet: null }),
  },
}));

export const useActiveMeal = () => useUiStore((s) => s.activeMeal);
export const useActiveSheet = () => useUiStore((s) => s.activeSheet);
export const useUiActions = () => useUiStore((s) => s.actions);
