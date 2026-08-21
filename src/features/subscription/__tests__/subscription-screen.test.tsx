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

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("../index", () => ({
  useSubscription: () => mockUseSubscription(),
  useOfferings: () => mockUseOfferings(),
  productForPlan: (products: { plan: string }[] | undefined, plan: string) =>
    products?.find((product) => product.plan === plan),
  useStartTrial: () => ({ mutate: mockStartTrialMutate, isPending: false }),
  usePurchaseSubscription: () => ({ mutate: mockPurchaseMutate, isPending: false }),
  useRestorePurchases: () => ({ mutate: mockRestoreMutate, isPending: false }),
  useCancelSubscription: () => ({ mutate: mockCancelMutate, isPending: false }),
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

    expect(mockStartTrialMutate).toHaveBeenCalledWith({ plan: "monthly", productId: undefined });
  });

  it("shows activation copy for users who already used a trial", () => {
    mockUseSubscription.mockReturnValue({
      data: { subscription: { ...baseSubscription, trialUsed: true, status: "expired" } },
      isLoading: false,
    });
    const screen = render(<SubscriptionPlansScreen />);

    fireEvent.press(screen.getByText("Activate monthly preview"));

    expect(mockPurchaseMutate).toHaveBeenCalledWith({
      plan: "monthly",
      productId: undefined,
      isTrial: false,
    });
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
});
