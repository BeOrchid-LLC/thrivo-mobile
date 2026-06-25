import { renderHook } from "@testing-library/react-native";
import { useBiometricAuthEnabled, usePreferencesStore } from "../preferences.store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("preferences store", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ biometricAuthEnabled: false });
  });

  it("defaults biometric auth to false when unset", () => {
    const { result } = renderHook(() => useBiometricAuthEnabled());

    expect(result.current).toBe(false);
  });

  it("can store a user biometric preference", () => {
    usePreferencesStore.getState().actions.setBiometricAuthEnabled(true);

    expect(usePreferencesStore.getState().biometricAuthEnabled).toBe(true);
  });
});
