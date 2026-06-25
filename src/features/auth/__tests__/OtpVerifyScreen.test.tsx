import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { OtpVerifyScreen } from "../screens/OtpVerifyScreen";

const mockVerifyMutate = jest.fn();
const mockRequestOtp = jest.fn();
let mockVerifyError: Error | null = null;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: "ada@example.com", source: "email" }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

jest.mock("../hooks/useAuth", () => ({
  useVerifyOtp: () => ({
    mutate: mockVerifyMutate,
    isPending: false,
    error: mockVerifyError,
  }),
  useRequestOtp: () => ({
    mutateAsync: mockRequestOtp,
    isPending: false,
    error: null,
  }),
}));

describe("OtpVerifyScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockVerifyError = null;
    mockRequestOtp.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("auto-verifies when the sixth digit is entered", async () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.changeText(screen.getByLabelText("Digit 1"), "123456");

    await waitFor(() =>
      expect(mockVerifyMutate).toHaveBeenCalledWith(
        { email: "ada@example.com", code: "123456" },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      )
    );
  });

  it("shows verify errors from invalid or rate-limited codes", () => {
    mockVerifyError = new Error("Too many failed attempts — try again in 30 seconds.");

    const screen = render(<OtpVerifyScreen />);

    expect(screen.getByText("Too many failed attempts — try again in 30 seconds.")).toBeTruthy();
  });

  it("resends only after the countdown expires", async () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.press(screen.getByText("Resend in 60s"));
    expect(mockRequestOtp).not.toHaveBeenCalled();

    act(() => {
      for (let i = 0; i < 60; i += 1) {
        jest.advanceTimersByTime(1000);
      }
    });
    fireEvent.press(screen.getByText("Resend code"));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({ email: "ada@example.com" }));
  });

  it("routes back to the request screen for a different email", () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.press(screen.getByText("Use a different email"));

    expect(router.replace).toHaveBeenCalledWith("/(auth)/email");
  });
});
