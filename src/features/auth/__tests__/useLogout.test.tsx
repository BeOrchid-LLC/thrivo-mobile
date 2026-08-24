import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useLogout } from "../hooks/useAuth";

/**
 * Signing out has to remove the *device's* copy of the user, not just the
 * session. `queryClient.clear()` empties memory only — the dehydrated cache is
 * written asynchronously and carries paused offline mutations (queued food,
 * water and weight writes). Kill the app right after signing out and those
 * rehydrate for whoever signs in next.
 */

const mockSignOut = jest.fn();
const mockClearSession = jest.fn();
const mockSetBiometricUnlocked = jest.fn();
const mockClearPersistedCache = jest.fn();
const mockBillingLogOut = jest.fn();
const mockCaptureException = jest.fn();
const mockResetStores = jest.fn();

jest.mock("@clerk/expo", () => ({
  useClerk: () => ({ signOut: mockSignOut }),
  useSSO: () => ({ startSSOFlow: jest.fn() }),
}));
jest.mock("@clerk/expo/google", () => ({ useSignInWithGoogle: () => ({}) }));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock("expo-auth-session", () => ({ makeRedirectUri: jest.fn(() => "thrivo://") }));

jest.mock("@/api", () => ({
  clearPersistedQueryCache: (...a: unknown[]) => mockClearPersistedCache(...a),
}));
jest.mock("@/lib", () => ({
  monitoring: { captureException: (...a: unknown[]) => mockCaptureException(...a) },
  subscription: { logOut: (...a: unknown[]) => mockBillingLogOut(...a) },
}));
jest.mock("@/stores", () => ({
  resetUserScopedStores: (...a: unknown[]) => mockResetStores(...a),
  useSessionActions: () => ({ clearSession: mockClearSession }),
  useBiometricUnlockActions: () => ({ setBiometricUnlocked: mockSetBiometricUnlocked }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockClearPersistedCache.mockResolvedValue(undefined);
    mockBillingLogOut.mockResolvedValue(undefined);
  });

  it("wipes the on-disk cache, so paused offline writes cannot replay for the next user", async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockClearPersistedCache).toHaveBeenCalledTimes(1));
  });

  it("drops the store identity, so a later restore cannot act on the previous user", async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockBillingLogOut).toHaveBeenCalledTimes(1));
  });

  it("clears local session state", async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockClearSession).toHaveBeenCalled());
    expect(mockSetBiometricUnlocked).toHaveBeenCalledWith(false);
  });

  it("still clears the device when Clerk sign-out fails", async () => {
    // onSettled, not onSuccess — a failed sign-out must not strand the data.
    mockSignOut.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockClearPersistedCache).toHaveBeenCalled());
    expect(mockClearSession).toHaveBeenCalled();
  });

  it("reports a failed purge rather than swallowing it", async () => {
    mockClearPersistedCache.mockRejectedValue(new Error("disk"));
    const { result } = renderHook(() => useLogout(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
  });
});
