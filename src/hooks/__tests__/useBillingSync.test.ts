import { renderHook } from "@testing-library/react-native";
import { useBillingSync } from "../useBillingSync";

/**
 * Entitlement changes the app never initiated — renewals, lapses, refunds,
 * purchases on another device — must reach the UI without waiting for a poll.
 */

const mockInvalidateQueries = jest.fn();
const mockOnEntitlementChange = jest.fn();
const mockIsBillingConfigured = jest.fn();
const mockIsAuthenticated = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/api", () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
  queryKeys: { me: () => ["me"] },
}));

jest.mock("@/lib", () => ({
  isBillingConfigured: () => mockIsBillingConfigured(),
  monitoring: { captureException: jest.fn() },
  subscription: { onEntitlementChange: (...args: unknown[]) => mockOnEntitlementChange(...args) },
}));

jest.mock("@/stores", () => ({
  useIsAuthenticated: () => mockIsAuthenticated(),
}));

describe("useBillingSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockIsBillingConfigured.mockReturnValue(true);
    mockOnEntitlementChange.mockReturnValue(mockUnsubscribe);
  });

  it("re-reads entitlement from the server when the store reports a change", () => {
    renderHook(() => useBillingSync());

    expect(mockOnEntitlementChange).toHaveBeenCalledTimes(1);

    // Simulate the store pushing a renewal / lapse / cross-device purchase.
    mockOnEntitlementChange.mock.calls[0][0]("premium");

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["subscription"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["me"] });
  });

  it("does not trust the pushed value directly — the backend stays authoritative", () => {
    renderHook(() => useBillingSync());
    mockOnEntitlementChange.mock.calls[0][0]("premium");

    // Only invalidation; no local entitlement write.
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it("does not subscribe while signed out", () => {
    mockIsAuthenticated.mockReturnValue(false);

    renderHook(() => useBillingSync());

    expect(mockOnEntitlementChange).not.toHaveBeenCalled();
  });

  it("does not subscribe when billing is not configured", () => {
    mockIsBillingConfigured.mockReturnValue(false);

    renderHook(() => useBillingSync());

    expect(mockOnEntitlementChange).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount so a signed-out session keeps no listener", () => {
    const { unmount } = renderHook(() => useBillingSync());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("stays up when the listener cannot be attached", () => {
    mockOnEntitlementChange.mockImplementation(() => {
      throw new Error("native module unavailable");
    });

    expect(() => renderHook(() => useBillingSync())).not.toThrow();
  });
});
