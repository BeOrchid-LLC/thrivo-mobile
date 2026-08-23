export {
  useSessionStore,
  useAccountStatus,
  useAuthStatus,
  useIsAuthenticated,
  useIsOnboarded,
  useIsOnboardingSkipped,
  useSessionActions,
  type AuthStatus,
} from "./session.store";
export { useUiStore, useActiveSheet, useUiActions } from "./ui.store";
export {
  useOnboardingDraftStore,
  useOnboardingDraft,
  useOnboardingDraftActions,
  type OnboardingDraft,
} from "./onboarding-draft.store";
export {
  usePreferencesStore,
  useBiometricAuthEnabled,
  usePreferencesHydrated,
  usePreferencesActions,
} from "./preferences.store";
export {
  useBiometricUnlockStore,
  useIsBiometricUnlocked,
  useBiometricUnlockActions,
} from "./biometric-unlock.store";
export {
  useFavoritesStore,
  useFavoriteIds,
  useIsFavorite,
  useFavoritesHydrated,
  useFavoritesActions,
} from "./favorites.store";

import { useFavoritesStore } from "./favorites.store";
import { useOnboardingDraftStore } from "./onboarding-draft.store";
import { usePreferencesStore } from "./preferences.store";
export function resetUserStores(): void {
  useFavoritesStore.getState().actions.reset();
  useOnboardingDraftStore.getState().actions.reset();
  usePreferencesStore.getState().actions.reset();
}
