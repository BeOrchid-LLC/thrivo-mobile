import { AppState } from "react-native";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useSessionRefresh } from "../useSessionRefresh";

/**
 * Foregrounding re-validates the session. The failure that matters is the one
 * that is *terminal*: a deleted account returns 404, not 401, and treating it as
 * transient leaves the app sitting on a dead session, silently failing every
 * refresh while still showing the user as signed in.
 */

const mockGetMe = jest.fn();
const mockHandleUnauthenticated = jest.fn();
const mockSetProfileStatus = jest.fn();
const mockClearSession = jest.fn();
const mockSetQueryData = jest.fn();
const mockStatus = jest.fn();

jest.mock("@/api", () => ({
  queryClient: { setQueryData: (...a: unknown[]) => mockSetQueryData(...a) },
  queryKeys: { me: () => ["me"] },
  handleUnauthenticated: (...a: unknown[]) => mockHandleUnauthenticated(...a),
  isApiError: (error: unknown) =>
    typeof error === "object" && error !== null && ("code" in error || "isAuthError" in error),
}));
jest.mock("@/features/profile", () => ({ getMe: (...a: unknown[]) => mockGetMe(...a) }));
jest.mock("@/stores", () => ({
  useSessionActions: () => ({
    setProfileStatus: mockSetProfileStatus,
    clearSession: mockClearSession,
  }),
  useSessionStore: { getState: () => ({ status: mockStatus() }) },
}));

function foreground() {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation(((_e: string, cb: never) => {
    listeners.push(cb as unknown as (state: string) => void);
    return { remove: jest.fn() };
  }) as never);
  return () => {
    // Simulate background → active, which is what the hook watches for.
    listeners.forEach((cb) => cb("background"));
    listeners.forEach((cb) => cb("active"));
  };
}

describe("useSessionRefresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus.mockReturnValue("authenticated");
    mockGetMe.mockResolvedValue({
      accountStatus: "free_trial",
      isOnboarded: true,
      isOnboardingSkipped: false,
    });
  });

  it("refreshes the profile on foreground", async () => {
    const enterForeground = foreground();
    renderHook(() => useSessionRefresh());

    enterForeground();

    await waitFor(() => expect(mockSetProfileStatus).toHaveBeenCalled());
  });

  it("signs out on 401", async () => {
    mockGetMe.mockRejectedValue({ isAuthError: true, code: "UNAUTHENTICATED" });
    const enterForeground = foreground();
    renderHook(() => useSessionRefresh());

    enterForeground();

    await waitFor(() => expect(mockHandleUnauthenticated).toHaveBeenCalled());
  });

  it("signs out on 404 — the account was deleted, possibly on another device", async () => {
    mockGetMe.mockRejectedValue({ isAuthError: false, code: "NOT_FOUND", status: 404 });
    const enterForeground = foreground();
    renderHook(() => useSessionRefresh());

    enterForeground();

    await waitFor(() => expect(mockHandleUnauthenticated).toHaveBeenCalled());
  });

  it("keeps the session on a transient failure", async () => {
    mockGetMe.mockRejectedValue(new Error("network"));
    const enterForeground = foreground();
    renderHook(() => useSessionRefresh());

    enterForeground();

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expect(mockHandleUnauthenticated).not.toHaveBeenCalled();
  });

  it("does nothing while signed out", async () => {
    mockStatus.mockReturnValue("unauthenticated");
    const enterForeground = foreground();
    renderHook(() => useSessionRefresh());

    enterForeground();

    expect(mockGetMe).not.toHaveBeenCalled();
  });
});
