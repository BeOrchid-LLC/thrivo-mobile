import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SubscriptionPlansScreen } from "../screens/SubscriptionPlansScreen";

const mockUseSubscription = jest.fn();
const mockStartTrialMutate = jest.fn();
const mockPurchaseMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockRestoreMutate = jest.fn();
const mockUseOfferings = jest.fn();
const mockBillingConfigured = jest.fn();
const mockShowToast = jest.fn();
const mockRefetch = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("../index", () => ({
  useSubscription: () => mockUseSubscription(),
  useOfferings: () => mockUseOfferings(),
  useOfferingsDiagnostics: jest.fn(),
  productForPlan: (products: { plan: string }[] | undefined, plan: string) =>
    products?.find((product) => product.plan === plan),
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
  analytics: { track: jest.fn() },
  // Billing off by default keeps the existing backend-path assertions valid;
  // the store-path cases override it.
  isBillingConfigured: () => mockBillingConfigured(),
}));

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

describe("SubscriptionPlansScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockBillingConfigured.mockReturnValue(false);
    mockUseOfferings.mockReturnValue({ data: [], isLoading: false });
    mockUseSubscription.mockReturnValue({
      data: { subscription: baseSubscription },
      isLoading: false,
    });
  });

  it("starts a premium preview for users who have not used one", () => {
    const screen = render(<SubscriptionPlansScreen />);

    expect(
      screen.getByText("Premium unlocks activity history and trend charts beyond 14 days.")
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Start premium preview"));

    expect(mockStartTrialMutate).toHaveBeenCalledWith(
      { plan: "monthly", productId: undefined },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("shows activation copy for users who already used a trial", () => {
    mockUseSubscription.mockReturnValue({
      data: { subscription: { ...baseSubscription, trialUsed: true, status: "expired" } },
      isLoading: false,
    });
    const screen = render(<SubscriptionPlansScreen />);

    fireEvent.press(screen.getByText("Activate monthly preview"));

    expect(mockPurchaseMutate).toHaveBeenCalledWith(
      { plan: "monthly", productId: undefined, isTrial: false },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("cancels an active subscription and auto-closes success after 30 seconds", () => {
    jest.useFakeTimers();
    mockCancelMutate.mockImplementation((_payload, options) =>
      options?.onSuccess?.({ openedStore: false })
    );
    mockUseSubscription.mockReturnValue({
      data: {
        subscription: {
          ...baseSubscription,
          entitlement: "premium",
          status: "active",
          plan: "monthly",
          priceLabel: "$14.99",
          renewsAt: "2026-07-18T00:00:00.000Z",
          accessEndsAt: "2026-07-18T00:00:00.000Z",
          trialUsed: true,
        },
      },
      isLoading: false,
    });

    const screen = render(<SubscriptionPlansScreen />);

    fireEvent.press(screen.getByText("Cancel subscription"));
    fireEvent.press(screen.getByText("Cancel my subscription"));

    expect(screen.getByText("Subscription cancelled")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(router.replace).toHaveBeenCalledWith("/(app)/dashboard");
  });

  describe("with store billing live", () => {
    beforeEach(() => {
      mockBillingConfigured.mockReturnValue(true);
      mockUseOfferings.mockReturnValue({
        data: [{ id: "thrivo_monthly", plan: "monthly", priceLabel: "£12.99", hasFreeTrial: true }],
        isLoading: false,
      });
    });

    it("shows the live store price rather than the hardcoded fallback", () => {
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("£12.99")).toBeTruthy();
      expect(screen.queryByText("Store billing not configured")).toBeNull();
    });

    it("blocks purchase when the store returned no product for the plan", () => {
      mockUseOfferings.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        refetch: mockRefetch,
      });
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("We couldn't load plans from the App Store.")).toBeTruthy();
      expect(mockStartTrialMutate).not.toHaveBeenCalled();
    });

    it("offers a retry instead of a dead spinner when plans fail to load", () => {
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

    it("names the loading state instead of spinning a blank button", () => {
      mockUseOfferings.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        refetch: mockRefetch,
      });
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.getByText("Loading plans…")).toBeTruthy();
    });

    it("confirms a successful restore", () => {
      mockRestoreMutate.mockImplementation((_vars, options) =>
        options?.onSuccess?.({ entitlement: "premium" })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Restore purchases"));

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    });

    it("says so when a restore finds nothing, instead of failing silently", () => {
      mockRestoreMutate.mockImplementation((_vars, options) =>
        options?.onSuccess?.({ entitlement: "free" })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Restore purchases"));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No previous purchases found on this account.",
          variant: "error",
        })
      );
    });

    it("confirms the purchase, so a completed payment is never silent", () => {
      mockStartTrialMutate.mockImplementation((_vars, options) =>
        options?.onSuccess?.({ completed: true })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start premium preview"));

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    });

    it("stays quiet when the user dismisses the store sheet", () => {
      mockStartTrialMutate.mockImplementation((_vars, options) =>
        options?.onSuccess?.({ completed: false })
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start premium preview"));

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it("tells the user they were not charged when a purchase fails", () => {
      mockStartTrialMutate.mockImplementation((_vars, options) =>
        options?.onError?.(new Error("x"))
      );
      const screen = render(<SubscriptionPlansScreen />);

      fireEvent.press(screen.getByText("Start premium preview"));

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "That didn't go through. You have not been charged.",
          variant: "error",
        })
      );
    });

    it("offers to subscribe rather than trial when the store reports no intro offer", () => {
      // The store decides eligibility, not our backend `trialUsed` flag.
      mockUseOfferings.mockReturnValue({
        data: [
          { id: "thrivo_monthly", plan: "monthly", priceLabel: "£12.99", hasFreeTrial: false },
        ],
        isLoading: false,
      });
      const screen = render(<SubscriptionPlansScreen />);

      expect(screen.queryByText("Start premium preview")).toBeNull();
      expect(screen.getByText("Activate monthly preview")).toBeTruthy();
    });
  });
});
