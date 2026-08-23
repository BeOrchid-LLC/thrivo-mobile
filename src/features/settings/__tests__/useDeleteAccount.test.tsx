import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useDeleteAccount } from "../hooks/useDeleteAccount";

/**
 * Deletion spans two systems, so the ordering guarantees are the thing worth
 * pinning down: the backend is authoritative, local state must not be cleared
 * before it confirms, and mobile never deletes the Clerk identity directly.
 */

const mockCallApi = jest.fn();
const mockSignOut = jest.fn();
const mockClearSession = jest.fn();
const mockSetBiometricUnlocked = jest.fn();
const mockCaptureException = jest.fn();
const mockClearStorage = jest.fn();
const mockClearQueryCache = jest.fn();

jest.mock("@/api", () => ({
  callApi: (...args: unknown[]) => mockCallApi(...args),
  clearPersistedQueryCache: (...args: unknown[]) => mockClearQueryCache(...args),
}));

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}));

jest.mock("@/lib", () => ({
  clearUserScopedStorage: (...args: unknown[]) => mockClearStorage(...args),
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
    mockSignOut.mockResolvedValue(undefined);
    mockClearStorage.mockResolvedValue(undefined);
    mockClearQueryCache.mockResolvedValue(undefined);
  });

  it("queues backend erasure, then signs out without deleting Clerk locally", async () => {
    const order: string[] = [];
    mockCallApi.mockImplementation(async () => {
      order.push("backend");
    });
    mockSignOut.mockImplementation(async () => {
      order.push("signOut");
    });

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCallApi).toHaveBeenCalledWith("DELETE_ME");
    expect(order).toEqual(["backend", "signOut"]);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("aborts without signing out or purging local state when backend deletion fails", async () => {
    // Signing out here would look like success while the data still exists.
    mockCallApi.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it("clears local session state only after a confirmed deletion", async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockSetBiometricUnlocked).toHaveBeenCalledWith(false);
  });

  it("purges this device so nothing of the deleted account survives locally", async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Preferences and the queued offline writes...
    expect(mockClearStorage).toHaveBeenCalledTimes(1);
    // ...and the dehydrated query cache, which outlives queryClient.clear().
    expect(mockClearQueryCache).toHaveBeenCalledTimes(1);
  });

  it("leaves the device untouched when the backend delete fails", async () => {
    mockCallApi.mockRejectedValue(new Error("500"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockClearStorage).not.toHaveBeenCalled();
    expect(mockClearQueryCache).not.toHaveBeenCalled();
  });

  it("still completes when the device purge fails", async () => {
    mockClearStorage.mockRejectedValue(new Error("disk"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it("does not strand the user when sign-out fails after the account is gone", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClearSession).toHaveBeenCalled();
  });
});
