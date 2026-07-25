import { renderHook, waitFor } from "@testing-library/react-native";
import { useSessionStore } from "@/stores/session.store";
import { useSessionInit } from "../useSessionInit";

const mockGetMe = jest.fn();
const mockSetQueryData = jest.fn();
const mockHandleUnauthenticated = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/api", () => ({
  queryClient: { setQueryData: (...args: unknown[]) => mockSetQueryData(...args) },
  queryKeys: { me: () => ["me"] },
  handleUnauthenticated: (...args: unknown[]) => mockHandleUnauthenticated(...args),
  isApiError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "isAuthError" in error &&
    (error as { isAuthError: boolean }).isAuthError,
}));

jest.mock("@/features/profile", () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
}));

jest.mock("@/lib", () => ({
  analytics: { identify: jest.fn(), reset: jest.fn() },
  monitoring: { setUser: jest.fn() },
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

  it("moves to restore_error on a non-auth network failure", async () => {
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockGetMe.mockRejectedValue(new Error("Network error"));

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("restore_error");
    });
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
