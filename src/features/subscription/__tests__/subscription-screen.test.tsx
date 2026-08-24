import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SubscriptionPlansScreen } from "../screens/SubscriptionPlansScreen";

/**
 * A subscription moves through states the app does not control, and each one
 * affords different actions. Showing the wrong one is worse than showing
 * nothing: offering "cancel" to someone who already cancelled, or "subscribe" to
 * someone already paying, both read as the app having lost track of their money.
 */

const mockUseSubscription = jest.fn();
const mockUseOfferings = jest.fn();
const mockStartTrialMutate = jest.fn();
const mockPurchaseMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockRestoreMutate = jest.fn();
const mockRefetch = jest.fn();
const mockShowToast = jest.fn();
const mockTrack = jest.fn();
const mockBillingConfigured = jest.fn();

jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn() } }));

jest.mock("../index", () => ({
  useSubscription: () => mockUseSubscription(),
  useOfferings: () => mockUseOfferings(),
  useOfferingsDiagnostics: jest.fn(),
  productForPlan: (products: { plan: string }[] | undefined, plan: string) =>
    products?.find((p) => p.plan === plan),
  useStartTrial: () => ({ mutate: mockStartTrialMutate, isPending: false }),
  usePurchaseSubscription: () => ({ mutate: mockPurchaseMutate, isPending: false }),
  useRestorePurchases: () => ({ mutate: mockRestoreMutate, isPending: false }),
  useCancelSubscription: () => ({ mutate: mockCancelMutate, isPending: false }),
}));

jest.mock("@/components", () => ({
  ...jest.requireActual("@/components"),
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock("@/lib", () => ({
  analytics: { track: (...a: unknown[]) => mockTrack(...a) },
  isBillingConfigured: () => mockBillingConfigured(),
}));

const PRODUCTS = [
  { id: "monthly", plan: "monthly", priceLabel: "$14.99", hasFreeTrial: true },
  { id: "annual", plan: "annual", priceLabel: "$150.00", hasFreeTrial: true },
];

const baseSubscription = {
  entitlement: "free",
  status: "none",
  plan: null,
  productId: null,
  priceLabel: null,
  renewsAt: null,
  accessEndsAt: null,
  cancelAtPeriodEnd: false,
  trialUsed: false,
  trialDays: 14,
  plans: [],
};

function setSubscription(overrides: Record<string, unknown> = {}) {
  mockUseSubscription.mockReturnValue({
    data: { subscription: { ...baseSubscription, ...overrides } },
    isLoading: false,
  });
}

describe("SubscriptionPlansScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockBillingConfigured.mockReturnValue(true);
    mockUseOfferings.mockReturnValue({
      data: PRODUCTS,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    });
    setSubscription();
  });

  it("reports the paywall impression on render", () => {
    render(<SubscriptionPlansScreen />);
    expect(mockTrack).toHaveBeenCalledWith("thrivo.paywall_viewed");
  });

  describe("with no subscription", () => {
    it("offers the free trial when the store still has an intro offer", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Subscription plans")).toBeTruthy();
      fireEvent.press(screen.getByText("Start free trial"));

      expect(mockStartTrialMutate).toHaveBeenCalledWith(
        { plan: "monthly", productId: "monthly" },
        expect.anything()
      );
    });

    it("sells the plan outright once the intro offer is used up", () => {
      mockUseOfferings.mockReturnValue({
        data: [{ id: "monthly", plan: "monthly", priceLabel: "$14.99", hasFreeTrial: false }],
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
      });
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Subscribe monthly"));

      expect(mockPurchaseMutate).toHaveBeenCalledWith(
        { plan: "monthly", productId: "monthly", isTrial: false },
        expect.anything()
      );
    });

    it("shows the live store price, not a hardcoded fallback", () => {
      const screen = render(<SubscriptionPlansScreen />);
      // Composed with the period in the headline, so assert the billed row.
      expect(screen.getByText("$14.99 per month")).toBeTruthy();
    });

    it("offers a retry rather than a dead button when plans fail to load", () => {
      mockUseOfferings.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
      });
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Try again"));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("while trialing", () => {
    beforeEach(() =>
      setSubscription({
        entitlement: "premium",
        status: "trialing",
        plan: "monthly",
        priceLabel: "$14.99",
        accessEndsAt: "2026-09-05T00:00:00.000Z",
      })
    );

    it("says when the trial ends and what happens next", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Your subscription")).toBeTruthy();
      expect(screen.getByText("Free trial")).toBeTruthy();
      expect(screen.getByText("Trial ends")).toBeTruthy();
      expect(screen.getByText("Then you pay")).toBeTruthy();
    });

    it("does not try to sell a plan to someone already on one", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.queryByText("Start free trial")).toBeNull();
      expect(screen.queryByText("Subscribe monthly")).toBeNull();
    });
  });

  describe("while actively subscribed", () => {
    beforeEach(() =>
      setSubscription({
        entitlement: "premium",
        status: "active",
        plan: "monthly",
        priceLabel: "$14.99",
        renewsAt: "2026-09-22T00:00:00.000Z",
      })
    );

    it("shows the renewal date and price", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Renews on")).toBeTruthy();
      expect(screen.getByText("September 22, 2026")).toBeTruthy();
      expect(screen.getByText("$14.99")).toBeTruthy();
    });

    it("offers switching to the other plan, not the one they already have", () => {
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Switch to annual"));

      expect(mockPurchaseMutate).toHaveBeenCalledWith(
        { plan: "annual", productId: "annual", isTrial: false },
        expect.anything()
      );
    });

    it("routes cancellation to the store and does not claim it is done", () => {
      mockCancelMutate.mockImplementation((_p, options) =>
        options?.onSuccess?.({ openedStore: true })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Cancel subscription"));
      fireEvent.press(screen.getByText("Manage in app store"));

      expect(screen.queryByText("Subscription cancelled")).toBeNull();
    });
  });

  describe("after cancelling, while access remains", () => {
    beforeEach(() =>
      setSubscription({
        entitlement: "premium",
        status: "canceled",
        plan: "annual",
        priceLabel: "$150.00",
        cancelAtPeriodEnd: true,
        accessEndsAt: "2026-12-01T00:00:00.000Z",
      })
    );

    it("says it will not renew and when access ends", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Cancelled — will not renew")).toBeTruthy();
      expect(screen.getByText("Access ends")).toBeTruthy();
      expect(screen.getByText("December 1, 2026")).toBeTruthy();
    });

    it("offers to resubscribe instead of cancelling again", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.queryByText("Cancel subscription")).toBeNull();
      fireEvent.press(screen.getByText("Resubscribe annual"));

      expect(mockPurchaseMutate).toHaveBeenCalledWith(
        { plan: "annual", productId: "annual", isTrial: false },
        expect.anything()
      );
    });
  });

  describe("feedback", () => {
    it("confirms a completed purchase", () => {
      mockStartTrialMutate.mockImplementation((_v, options) =>
        options?.onSuccess?.({ completed: true })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start free trial"));

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    });

    it("stays quiet when the store sheet is dismissed", () => {
      mockStartTrialMutate.mockImplementation((_v, options) =>
        options?.onSuccess?.({ completed: false })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start free trial"));

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("says the user was not charged when a purchase fails", () => {
      mockStartTrialMutate.mockImplementation((_v, options) => options?.onError?.(new Error("x")));
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start free trial"));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "That didn't go through. You have not been charged.",
          variant: "error",
        })
      );
    });

    it("reports the outcome of a restore", () => {
      mockRestoreMutate.mockImplementation((_v, options) =>
        options?.onSuccess?.({ entitlement: "free" })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Restore purchases"));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No previous purchases found on this account." })
      );
    });
  });

  describe("without store billing", () => {
    beforeEach(() => mockBillingConfigured.mockReturnValue(false));

    it("says so, and hides restore which cannot work", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Store billing not configured")).toBeTruthy();
      expect(screen.queryByText("Restore purchases")).toBeNull();
    });

    it("still records a backend cancellation as done", () => {
      setSubscription({ entitlement: "premium", status: "active", plan: "monthly" });
      mockCancelMutate.mockImplementation((_p, options) =>
        options?.onSuccess?.({ openedStore: false })
      );
      jest.useFakeTimers();
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Cancel subscription"));
      fireEvent.press(screen.getByText("Cancel my subscription"));

      expect(screen.getByText("Subscription cancelled")).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(30000);
      });
      expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)/dashboard");
    });
  });
});
