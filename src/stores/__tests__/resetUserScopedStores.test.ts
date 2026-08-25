import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  resetUserScopedStores,
  useFavoritesStore,
  useOnboardingDraftStore,
  usePreferencesStore,
} from "../index";
import { clearUserScopedStorage } from "@/lib/storage";

/**
 * Three Zustand stores persist themselves to AsyncStorage under their own keys,
 * outside `storageKeys`. Nothing else in the app referenced them, so every
 * "clear the device" path missed them: the next person to sign in inherited the
 * previous user's favourited foods and had their own onboarding prefilled with
 * someone else's name, and account deletion left it all behind while promising
 * the data was gone.
 */
describe("resetUserScopedStores", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFavoritesStore.setState({ favoriteIds: [] });
    useOnboardingDraftStore.getState().actions.reset();
    usePreferencesStore.setState({ biometricAuthEnabled: false });
  });

  it("drops the previous user's favourited foods", () => {
    useFavoritesStore.setState({ favoriteIds: ["food-1", "food-2"] });

    resetUserScopedStores();

    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });

  it("drops the onboarding draft, so the next user is not prefilled with a stranger's name", () => {
    useOnboardingDraftStore.getState().actions.setFields({ firstName: "Dior", goal: "lose" });

    resetUserScopedStores();

    expect(useOnboardingDraftStore.getState().draft).toEqual({});
  });

  it("drops the biometric preference", () => {
    usePreferencesStore.setState({ biometricAuthEnabled: true });

    resetUserScopedStores();

    expect(usePreferencesStore.getState().biometricAuthEnabled).toBe(false);
  });

  it("removes the persisted copies from disk too", async () => {
    // In-memory reset alone is not enough — and clearing disk alone is not
    // either, since a later state change would rewrite it.
    await AsyncStorage.setItem(
      "thrivo.favorites",
      JSON.stringify({ state: { favoriteIds: ["x"] } })
    );
    await AsyncStorage.setItem(
      "thrivo.onboarding-draft",
      JSON.stringify({ state: { draft: { firstName: "Dior" } } })
    );
    await AsyncStorage.setItem(
      "thrivo.preferences",
      JSON.stringify({ state: { biometricAuthEnabled: true } })
    );

    await clearUserScopedStorage();

    expect(await AsyncStorage.getItem("thrivo.favorites")).toBeNull();
    expect(await AsyncStorage.getItem("thrivo.onboarding-draft")).toBeNull();
    expect(await AsyncStorage.getItem("thrivo.preferences")).toBeNull();
  });
});
