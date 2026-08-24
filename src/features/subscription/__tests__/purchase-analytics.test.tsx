import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

/**
 * The purchase funnel events, asserted by running the hooks rather than reading
 * the source: a name typo here produces a second, near-identical event in
 * PostHog that nobody notices until the funnel is already wrong.
 */

const mockTrack = jest.fn();
const mockPurchase = jest.fn();
const mockGetManagementUrl = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/lib", () => ({
  analytics: { track: (...a: unknown[]) => mockTrack(...a) },
  isBillingConfigured: () => true,
  monitoring: { captureException: (...a: unknown[]) => mockCaptureException(...a) },
  subscription: {
    purchase: (...a: unknown[]) => mockPurchase(...a),
    getManagementUrl: (...a: unknown[]) => mockGetManagementUrl(...a),
  },
}));

jest.mock("../api/subscription.api", () => ({
  purchaseSubscription: jest.fn(async () => ({ subscription: {} })),
  startTrial: jest.fn(async () => ({ subscription: {} })),
  cancelSubscription: jest.fn(async () => ({ subscription: {} })),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("purchase funnel analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPurchase.mockResolvedValue({ entitlement: "premium", completed: true });
    mockGetManagementUrl.mockResolvedValue(null);
    // Cancellation hands off to the store; keep it from leaving the test.
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  it("emits thrivo.trial_started when a trial is redeemed", async () => {
    const { useStartTrial } = require("../hooks/useStartTrial");
    const { result } = renderHook(() => useStartTrial(), { wrapper });

    result.current.mutate({ plan: "monthly", productId: "p1" });

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith("thrivo.trial_started", {
        plan: "monthly",
        productId: "p1",
      })
    );
  });

  it("emits thrivo.subscription_started for a paid purchase", async () => {
    const { usePurchaseSubscription } = require("../hooks/usePurchaseSubscription");
    const { result } = renderHook(() => usePurchaseSubscription(), { wrapper });

    result.current.mutate({ plan: "annual", productId: "p2", isTrial: false });

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith("thrivo.subscription_started", {
        plan: "annual",
        productId: "p2",
      })
    );
  });

  it("does not emit a purchase event when the sheet is dismissed", async () => {
    mockPurchase.mockResolvedValue({ entitlement: "free", completed: false });
    const { usePurchaseSubscription } = require("../hooks/usePurchaseSubscription");
    const { result } = renderHook(() => usePurchaseSubscription(), { wrapper });

    result.current.mutate({ plan: "monthly", productId: "p1", isTrial: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("emits thrivo.subscription_cancelled on cancellation", async () => {
    const { useCancelSubscription } = require("../hooks/useCancelSubscription");
    const { result } = renderHook(() => useCancelSubscription(), { wrapper });

    result.current.mutate({});

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith("thrivo.subscription_cancelled", undefined)
    );
  });
});
