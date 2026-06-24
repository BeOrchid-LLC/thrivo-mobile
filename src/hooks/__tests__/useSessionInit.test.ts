import { renderHook, waitFor } from "@testing-library/react-native";
import { callApi } from "@/api";
import { getToken, clearToken } from "@/lib";
import { useSessionStore } from "@/stores/session.store";
import { useSessionInit } from "../useSessionInit";

jest.mock("@/stores", () => {
  const store =
    jest.requireActual<typeof import("@/stores/session.store")>("@/stores/session.store");
  return {
    useAuthStatus: () => store.useSessionStore((s) => s.status),
    useSessionActions: () => store.useSessionStore((s) => s.actions),
  };
});

jest.mock("@/api", () => ({
  callApi: jest.fn(),
  isApiError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "isAuthError" in error &&
    (error as { isAuthError: boolean }).isAuthError,
}));

jest.mock("@/lib", () => ({
  getToken: jest.fn(),
  clearToken: jest.fn(),
}));

const mockCallApi = callApi as jest.MockedFunction<typeof callApi>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockClearToken = clearToken as jest.MockedFunction<typeof clearToken>;

describe("useSessionInit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({
      status: "loading",
      token: null,
      userId: null,
      accountStatus: null,
      isOnboarded: false,
    });
  });

  it("marks unauthenticated when no token is stored", async () => {
    mockGetToken.mockResolvedValue(null);

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it("restores session via GET_SESSION when a token exists", async () => {
    mockGetToken.mockResolvedValue("access-token");
    mockCallApi.mockResolvedValue({
      session: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        accountStatus: "free_trial",
        isOnboarded: false,
      },
    });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("authenticated");
    });
    expect(mockCallApi).toHaveBeenCalledWith("GET_SESSION");
    expect(useSessionStore.getState().userId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(useSessionStore.getState().isOnboarded).toBe(false);
  });

  it("clears session on auth error from GET_SESSION", async () => {
    mockGetToken.mockResolvedValue("access-token");
    mockCallApi.mockRejectedValue({ isAuthError: true });

    renderHook(() => useSessionInit());

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
    expect(mockClearToken).toHaveBeenCalled();
  });
});
