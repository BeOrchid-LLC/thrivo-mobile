import { renderHook } from "@testing-library/react-native";
import { useBiometricAuthEnabled, usePreferencesStore } from "../preferences.store";

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
