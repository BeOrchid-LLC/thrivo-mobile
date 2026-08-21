import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useDeleteAccount } from "../hooks/useDeleteAccount";

/**
 * Deletion spans two systems, so the ordering guarantees are the thing worth
 * pinning down: the backend is authoritative, local state must not be cleared
 * before it confirms, and a Clerk failure after a successful backend delete must
 * not make a completed deletion look failed.
 */

const mockCallApi = jest.fn();
const mockClerkDelete = jest.fn();
const mockSignOut = jest.fn();
const mockClearSession = jest.fn();
const mockSetBiometricUnlocked = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/api", () => ({
  callApi: (...args: unknown[]) => mockCallApi(...args),
}));

jest.mock("@clerk/expo", () => ({
  useUser: () => ({ user: { delete: mockClerkDelete } }),
  useClerk: () => ({ signOut: mockSignOut }),
}));

jest.mock("@/lib", () => ({
  monitoring: {
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    setUser: jest.fn(),
  },
}));

jest.mock("@/stores", () => ({
  useSessionActions: () => ({ clearSession: mockClearSession }),
  useBiometricUnlockActions: () => ({ setBiometricUnlocked: mockSetBiometricUnlocked }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useDeleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallApi.mockResolvedValue(null);
    mockClerkDelete.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("deletes on the backend, then removes the Clerk identity, then signs out", async () => {
    const order: string[] = [];
    mockCallApi.mockImplementation(async () => {
      order.push("backend");
    });
    mockClerkDelete.mockImplementation(async () => {
      order.push("clerk");
    });
    mockSignOut.mockImplementation(async () => {
      order.push("signOut");
    });

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCallApi).toHaveBeenCalledWith("DELETE_ME");
    expect(order).toEqual(["backend", "clerk", "signOut"]);
  });

  it("aborts without touching Clerk or local state when the backend delete fails", async () => {
    // Signing out here would look like success while the data still exists.
    mockCallApi.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockClerkDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("still succeeds when Clerk deletion throws because the backend already removed the identity", async () => {
    mockClerkDelete.mockRejectedValue(new Error("user not found"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it("clears local session state only after a confirmed deletion", async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockSetBiometricUnlocked).toHaveBeenCalledWith(false);
  });

  it("does not strand the user when sign-out fails after the account is gone", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClearSession).toHaveBeenCalled();
  });
});
