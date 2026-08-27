import { renderHook } from "@testing-library/react-native";
import { usePreferencesStore, useSessionStore } from "@/stores";
import { useHasDismissedOnboarding } from "../useHasDismissedOnboarding";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

describe("useHasDismissedOnboarding", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ onboardingDismissedFor: null });
    useSessionStore.setState({ userId: null });
  });

  it("is false before anyone has been through to the app", () => {
    useSessionStore.setState({ userId: "user-1" });

    expect(renderHook(() => useHasDismissedOnboarding()).result.current).toBe(false);
  });

  it("is true for the user who has already reached the app", () => {
    useSessionStore.setState({ userId: "user-1" });
    usePreferencesStore.setState({ onboardingDismissedFor: "user-1" });

    expect(renderHook(() => useHasDismissedOnboarding()).result.current).toBe(true);
  });

  it("does not carry across accounts on a shared device", () => {
    useSessionStore.setState({ userId: "user-2" });
    usePreferencesStore.setState({ onboardingDismissedFor: "user-1" });

    expect(renderHook(() => useHasDismissedOnboarding()).result.current).toBe(false);
  });

  it("is false while no one is signed in", () => {
    usePreferencesStore.setState({ onboardingDismissedFor: "user-1" });

    expect(renderHook(() => useHasDismissedOnboarding()).result.current).toBe(false);
  });
});
