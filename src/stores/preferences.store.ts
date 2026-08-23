import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PreferencesState {
  biometricAuthEnabled: boolean;
  hasHydrated: boolean;
  actions: {
    setBiometricAuthEnabled: (enabled: boolean) => void;
    setHasHydrated: (hasHydrated: boolean) => void;
    reset: () => void;
  };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      biometricAuthEnabled: false,
      hasHydrated: false,
      actions: {
        setBiometricAuthEnabled: (biometricAuthEnabled) => set({ biometricAuthEnabled }),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        reset: () => set({ biometricAuthEnabled: false }),
      },
    }),
    {
      name: "thrivo.preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ biometricAuthEnabled: state.biometricAuthEnabled }),
      onRehydrateStorage: () => (state) => {
        state?.actions.setHasHydrated(true);
      },
    }
  )
);

export const useBiometricAuthEnabled = () =>
  usePreferencesStore((s) => s.biometricAuthEnabled ?? false);
export const usePreferencesHydrated = () => usePreferencesStore((s) => s.hasHydrated);
export const usePreferencesActions = () => usePreferencesStore((s) => s.actions);
