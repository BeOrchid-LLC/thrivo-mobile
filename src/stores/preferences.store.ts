import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PreferencesState {
  biometricAuthEnabled: boolean;
  actions: {
    setBiometricAuthEnabled: (enabled: boolean) => void;
  };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      biometricAuthEnabled: false,
      actions: {
        setBiometricAuthEnabled: (biometricAuthEnabled) => set({ biometricAuthEnabled }),
      },
    }),
    {
      name: "thrivo.preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ biometricAuthEnabled: state.biometricAuthEnabled }),
    }
  )
);

export const useBiometricAuthEnabled = () =>
  usePreferencesStore((s) => s.biometricAuthEnabled ?? false);
export const usePreferencesActions = () => usePreferencesStore((s) => s.actions);
