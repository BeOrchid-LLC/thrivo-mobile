import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { SignInScreen } from "../screens/SignInScreen";

const mockRequestOtp = jest.fn();
const mockGoogleMutate = jest.fn();
const mockAppleMutate = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock("../hooks/useAuth", () => ({
  useRequestOtp: () => ({
    mutateAsync: mockRequestOtp,
    isPending: false,
    error: null,
  }),
  useGoogleSignIn: () => ({
    mutate: mockGoogleMutate,
    isPending: false,
    error: null,
    isConfigured: true,
  }),
  useAppleSignIn: () => ({
    mutate: mockAppleMutate,
    isPending: false,
    error: null,
  }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestOtp.mockResolvedValue(null);
  });

  it("requests an OTP and routes to the code screen", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "ada@example.com");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({ email: "ada@example.com" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(auth)/otp",
      params: { email: "ada@example.com", source: "sign-in" },
    });
  });

  it("blocks the OTP request and shows a validation error for an invalid email", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "not-an-email");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => expect(screen.getByText("Invalid email")).toBeTruthy());
    expect(mockRequestOtp).not.toHaveBeenCalled();
  });

  it("routes social button presses through the real social hooks", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Continue with Google"));

    expect(mockGoogleMutate).toHaveBeenCalledTimes(1);
  });
});
