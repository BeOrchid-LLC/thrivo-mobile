import { renderHook } from "@testing-library/react-native";
import {
  useBiometricAuthEnabled,
  useOnboardingDismissedFor,
  usePreferencesStore,
} from "../preferences.store";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe("preferences store", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ biometricAuthEnabled: false, onboardingDismissedFor: null });
  });

  it("defaults biometric auth to false when unset", () => {
    const { result } = renderHook(() => useBiometricAuthEnabled());

    expect(result.current).toBe(false);
  });

  it("can store a user biometric preference", () => {
    usePreferencesStore.getState().actions.setBiometricAuthEnabled(true);

    expect(usePreferencesStore.getState().biometricAuthEnabled).toBe(true);
  });

  it("records which user has already been through to the app", () => {
    const { result } = renderHook(() => useOnboardingDismissedFor());

    expect(result.current).toBeNull();

    usePreferencesStore.getState().actions.markOnboardingDismissed("user-1");

    expect(usePreferencesStore.getState().onboardingDismissedFor).toBe("user-1");
  });

  it("keeps the onboarding dismissal through a sign-out reset", () => {
    // Clearing it would re-open the gate the next time the same person signs
    // in; it is keyed by user id, so it is never another account's state.
    usePreferencesStore.getState().actions.markOnboardingDismissed("user-1");
    usePreferencesStore.getState().actions.setBiometricAuthEnabled(true);

    usePreferencesStore.getState().actions.reset();

    expect(usePreferencesStore.getState().biometricAuthEnabled).toBe(false);
    expect(usePreferencesStore.getState().onboardingDismissedFor).toBe("user-1");
  });
});
