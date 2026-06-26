import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SubscriptionPlansScreen } from "../screens/SubscriptionPlansScreen";

const mockUseSubscription = jest.fn();
const mockStartTrialMutate = jest.fn();
const mockPurchaseMutate = jest.fn();
const mockCancelMutate = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("../index", () => ({
  useSubscription: () => mockUseSubscription(),
  useStartTrial: () => ({ mutate: mockStartTrialMutate, isPending: false }),
  usePurchaseSubscription: () => ({ mutate: mockPurchaseMutate, isPending: false }),
  useCancelSubscription: () => ({ mutate: mockCancelMutate, isPending: false }),
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
    mockUseSubscription.mockReturnValue({
      data: { subscription: baseSubscription },
      isLoading: false,
    });
  });

  it("starts a free trial for users who have not used one", () => {
    const screen = render(<SubscriptionPlansScreen />);

    fireEvent.press(screen.getByText("Start free trial — $0 today"));

    expect(mockStartTrialMutate).toHaveBeenCalledWith({ plan: "monthly" });
  });

  it("shows subscribe copy for users who already used a trial", () => {
    mockUseSubscription.mockReturnValue({
      data: { subscription: { ...baseSubscription, trialUsed: true, status: "expired" } },
      isLoading: false,
    });
    const screen = render(<SubscriptionPlansScreen />);

    fireEvent.press(screen.getByText("Subscribe monthly"));

    expect(mockPurchaseMutate).toHaveBeenCalledWith({ plan: "monthly" });
  });

  it("cancels an active subscription and auto-closes success after 30 seconds", () => {
    jest.useFakeTimers();
    mockCancelMutate.mockImplementation((_payload, options) => options?.onSuccess?.());
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
