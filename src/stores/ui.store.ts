import { create } from "zustand";

/**
 * Transient, device-local UI state (MOBILE_ARCHITECTURE §4.2): things like
 * which bottom sheet is open. Never server data.
 */
interface UiState {
  /** Identifier of the currently-open bottom sheet, or null. */
  activeSheet: string | null;
  actions: {
    openSheet: (id: string) => void;
    closeSheet: () => void;
  };
}

export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  actions: {
    openSheet: (activeSheet) => set({ activeSheet }),
    closeSheet: () => set({ activeSheet: null }),
  },
}));

export const useActiveSheet = () => useUiStore((s) => s.activeSheet);
export const useUiActions = () => useUiStore((s) => s.actions);
