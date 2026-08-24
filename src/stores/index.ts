export {
  useSessionStore,
  useAccountStatus,
  useAuthStatus,
  useIsAuthenticated,
  useUserId,
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

/**
 * Wipes every persisted store that belongs to the signed-in user.
 *
 * Deleting the AsyncStorage keys alone is not enough: the stores are still
 * hydrated in memory, and the next state change would write the previous user's
 * data straight back. Called on sign-out and on account deletion.
 */
export function resetUserScopedStores(): void {
  useFavoritesStore.setState({ favoriteIds: [] });
  useOnboardingDraftStore.getState().actions.reset();
  usePreferencesStore.setState({ biometricAuthEnabled: false });
}
