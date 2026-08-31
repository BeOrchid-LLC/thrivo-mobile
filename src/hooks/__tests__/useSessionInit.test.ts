import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useSessionStore } from "@/stores/session.store";
import { useSessionInit } from "../useSessionInit";

const mockGetMe = jest.fn();
const mockSetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockHandleUnauthenticated = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/api", () => ({
  queryClient: {
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
  queryKeys: { me: () => ["me"], subscription: { me: () => ["subscription", "me"] } },
  handleUnauthenticated: (...args: unknown[]) => mockHandleUnauthenticated(...args),
  // Mirrors the real guard: any ApiError, not only auth errors. The hook now
  // distinguishes 401 from 404, so conflating the two here would hide that.
  isApiError: (error: unknown) =>
    typeof error === "object" && error !== null && ("code" in error || "isAuthError" in error),
}));

jest.mock("@/features/profile", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
}));

jest.mock("@/lib", () => ({
  analytics: { identify: jest.fn(), reset: jest.fn() },
  monitoring: { setUser: jest.fn(), captureException: jest.fn() },
  subscription: {
    configure: jest.fn(async () => undefined),
    logOut: jest.fn(async () => undefined),
  },
}));

jest.mock("@/stores", () => {
  const store =
    jest.requireActual<typeof import("@/stores/session.store")>("@/stores/session.store");
  return {
    useAuthStatus: () => store.useSessionStore((s) => s.status),
    useSessionActions: () => store.useSessionStore((s) => s.actions),
  };
});

const { useAuth } = jest.requireMock<typeof import("@clerk/expo")>("@clerk/expo");
const mockUseAuth = useAuth as jest.Mock;

describe("useSessionInit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleUnauthenticated.mockImplementation(() => {
      useSessionStore.getState().actions.clearSession();
    });
    useSessionStore.setState({
      status: "loading",
      userId: null,
      accountStatus: null,
      isOnboarded: false,
      isOnboardingSkipped: false,
    });
  });

  it("stays loading while Clerk is initializing", () => {
    mockUseAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });

    renderHook(() => useSessionInit());

    expect(useSessionStore.getState().status).toBe("loading");
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it("marks unauthenticated when Clerk is loaded but not signed in", async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it("restores session via GET /users/me when Clerk is signed in", async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockResolvedValue({
      id: "user-123",
      accountStatus: "free_trial",
      isOnboarded: false,
      isOnboardingSkipped: false,
    });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("authenticated");
    });
    expect(useSessionStore.getState().userId).toBe("user-123");
    expect(useSessionStore.getState().isOnboarded).toBe(false);
  });

  it("resyncs a Clerk-authenticated session after a sign-in race marked the store unauthenticated", async () => {
    useSessionStore.setState({
      status: "unauthenticated",
      userId: null,
      accountStatus: null,
      isOnboarded: false,
      isOnboardingSkipped: false,
    });
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockResolvedValue({
      id: "user-after-race",
      accountStatus: "free_trial",
      isOnboarded: true,
      isOnboardingSkipped: false,
    });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("authenticated");
    });
    expect(useSessionStore.getState().userId).toBe("user-after-race");
  });

  it("clears session on auth error from GET /users/me", async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockRejectedValue({ isAuthError: true });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
    expect(mockHandleUnauthenticated).toHaveBeenCalled();
  });

  it("signs out instead of offering a retry when the account no longer exists", async () => {
    // After deletion Clerk can still report a signed-in session while the
    // backend row is gone. A 404 is terminal — "Try again" can never succeed.
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockRejectedValue({ isAuthError: false, code: "NOT_FOUND", status: 404 });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
    expect(mockHandleUnauthenticated).toHaveBeenCalled();
    expect(useSessionStore.getState().status).not.toBe("restore_error");
  });

  it("moves to restore_error only once the retries are exhausted", async () => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockRejectedValue(new Error("Network error"));

    renderHook(() => useSessionInit());

    // A transient failure must not strand the user on the error screen while
    // retries are still outstanding.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(useSessionStore.getState().status).toBe("loading");

    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(useSessionStore.getState().status).toBe("restore_error");
    jest.useRealTimers();
  });

  it("recovers without surfacing an error when a transient failure clears", async () => {
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    // A rate limit on the first attempt — exactly the 429 that used to dump a
    // perfectly valid session onto "Could not restore your session".
    mockGetMe
      .mockRejectedValueOnce({ isAuthError: false, code: "RATE_LIMITED", status: 429 })
      .mockResolvedValueOnce({
        id: "u1",
        accountStatus: "active",
        isOnboarded: true,
        isOnboardingSkipped: false,
      });

    renderHook(() => useSessionInit());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(useSessionStore.getState().status).toBe("authenticated");
    expect(mockGetMe).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("does not apply a stale profile response after auth state changes", async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    let resolveProfile: ((value: unknown) => void) | undefined;
    mockGetMe.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      })
    );

    const hook = renderHook(() => useSessionInit());
    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());

    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    hook.rerender({});
    await waitFor(() => expect(useSessionStore.getState().status).toBe("unauthenticated"));

    resolveProfile?.({
      id: "stale-user",
      accountStatus: "free_trial",
      isOnboarded: false,
      isOnboardingSkipped: false,
    });
    await Promise.resolve();

    expect(useSessionStore.getState().userId).toBeNull();
    expect(useSessionStore.getState().status).toBe("unauthenticated");
  });
});
