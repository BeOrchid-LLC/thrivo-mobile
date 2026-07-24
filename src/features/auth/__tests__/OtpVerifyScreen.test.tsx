import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { OtpVerifyScreen } from "../screens/OtpVerifyScreen";

const mockVerifyEmailCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockSignUpFinalize = jest.fn();
const mockSignInFinalize = jest.fn();
const mockSendEmailCode = jest.fn();
const mockSignInSendCode = jest.fn();
const mockSetStatus = jest.fn();
const mockSetBiometricUnlocked = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: "ada@example.com", source: "email" }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

jest.mock("@clerk/expo", () => ({
  useSignUp: () => ({
    signUp: {
      verifications: {
        verifyEmailCode: mockVerifyEmailCode,
        sendEmailCode: mockSendEmailCode,
      },
      finalize: mockSignUpFinalize,
    },
  }),
  useSignIn: () => ({
    signIn: {
      emailCode: {
        verifyCode: mockVerifyCode,
        sendCode: mockSignInSendCode,
      },
      finalize: mockSignInFinalize,
    },
  }),
}));

jest.mock("@/stores", () => ({
  useSessionActions: () => ({ setStatus: mockSetStatus }),
  useBiometricUnlockActions: () => ({ setBiometricUnlocked: mockSetBiometricUnlocked }),
}));

describe("OtpVerifyScreen (sign-up flow)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockVerifyEmailCode.mockResolvedValue({ error: null });
    mockSignUpFinalize.mockResolvedValue({ error: null });
    mockSendEmailCode.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("verifies and activates the session when 6 digits are entered", async () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.changeText(screen.getByLabelText("Digit 1"), "123456");

    await waitFor(() => {
      expect(mockVerifyEmailCode).toHaveBeenCalledWith({ code: "123456" });
      expect(mockSignUpFinalize).toHaveBeenCalled();
      expect(mockSetStatus).toHaveBeenCalledWith("loading");
      expect(mockSetBiometricUnlocked).toHaveBeenCalledWith(true);
    });
  });

  it("marks the first OTP input for initial focus", () => {
    const screen = render(<OtpVerifyScreen />);
    expect(screen.getByLabelText("Digit 1").props.autoFocus).toBe(true);
  });

  it("shows an error from Clerk on invalid code", async () => {
    mockVerifyEmailCode.mockResolvedValue({
      error: { message: "Incorrect code.", longMessage: "Incorrect code." },
    });

    const screen = render(<OtpVerifyScreen />);

    fireEvent.changeText(screen.getByLabelText("Digit 1"), "000000");

    await waitFor(() => {
      expect(screen.getByText("Incorrect code.")).toBeTruthy();
    });
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it("resends the code only after the countdown expires", async () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.press(screen.getByText("Resend in 60s"));
    expect(mockSendEmailCode).not.toHaveBeenCalled();

    act(() => {
      for (let i = 0; i < 60; i++) jest.advanceTimersByTime(1000);
    });

    fireEvent.press(screen.getByText("Resend code"));

    await waitFor(() => expect(mockSendEmailCode).toHaveBeenCalled());
  });

  it("routes back to the email screen for a different email", () => {
    const screen = render(<OtpVerifyScreen />);

    fireEvent.press(screen.getByText("Use a different email"));

    expect(router.replace).toHaveBeenCalledWith("/(auth)/email");
  });
});
