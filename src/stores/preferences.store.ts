import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PreferencesState {
  biometricAuthEnabled: boolean;
  /**
   * The user who has already been through to the app, so the onboarding flow
   * must never gate them again — they reach it from Settings from then on.
   *
   * It holds the **user id** rather than a bare boolean so it cannot leak
   * across accounts on a shared device, and for that reason it deliberately
   * survives `reset()`: clearing it on sign-out would re-open the exact gate
   * this closes the next time the same person signs in. One id is kept, so two
   * accounts alternating on one device fall back to the server's
   * `isOnboardingSkipped` — the authority in the normal case.
   */
  onboardingDismissedFor: string | null;
  hasHydrated: boolean;
  actions: {
    setBiometricAuthEnabled: (enabled: boolean) => void;
    /** Called once the user is through to `(app)`; safe to call repeatedly. */
    markOnboardingDismissed: (userId: string) => void;
    setHasHydrated: (hasHydrated: boolean) => void;
    reset: () => void;
  };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      biometricAuthEnabled: false,
      onboardingDismissedFor: null,
      hasHydrated: false,
      actions: {
        setBiometricAuthEnabled: (biometricAuthEnabled) => set({ biometricAuthEnabled }),
        markOnboardingDismissed: (userId) =>
          set((state) =>
            state.onboardingDismissedFor === userId ? state : { onboardingDismissedFor: userId }
          ),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
        // `onboardingDismissedFor` is intentionally left alone — see above.
        reset: () => set({ biometricAuthEnabled: false }),
      },
    }),
    {
      name: "thrivo.preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        biometricAuthEnabled: state.biometricAuthEnabled,
        onboardingDismissedFor: state.onboardingDismissedFor,
      }),
      onRehydrateStorage: () => (state) => {
        state?.actions.setHasHydrated(true);
      },
    }
  )
);

export const useBiometricAuthEnabled = () =>
  usePreferencesStore((s) => s.biometricAuthEnabled ?? false);
export const useOnboardingDismissedFor = () =>
  usePreferencesStore((s) => s.onboardingDismissedFor ?? null);
export const usePreferencesHydrated = () => usePreferencesStore((s) => s.hasHydrated);
export const usePreferencesActions = () => usePreferencesStore((s) => s.actions);
