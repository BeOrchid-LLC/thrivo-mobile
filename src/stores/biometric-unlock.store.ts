import { create } from "zustand";

interface BiometricUnlockState {
  isBiometricUnlocked: boolean;
  actions: {
    setBiometricUnlocked: (isBiometricUnlocked: boolean) => void;
  };
}

export const useBiometricUnlockStore = create<BiometricUnlockState>((set) => ({
  isBiometricUnlocked: false,
  actions: {
    setBiometricUnlocked: (isBiometricUnlocked) => set({ isBiometricUnlocked }),
  },
}));

export const useIsBiometricUnlocked = () =>
  useBiometricUnlockStore((s) => s.isBiometricUnlocked);
export const useBiometricUnlockActions = () => useBiometricUnlockStore((s) => s.actions);
