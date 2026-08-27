import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { SignInScreen } from "../screens/SignInScreen";

const mockSignInCreate = jest.fn();
const mockSendCode = jest.fn();
const mockGoogleMutate = jest.fn();
const mockAppleMutate = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useSignIn: () => ({
    signIn: {
      create: mockSignInCreate,
      supportedFirstFactors: [{ strategy: "email_code", emailAddressId: "eid-1" }],
      emailCode: {
        sendCode: mockSendCode,
        verifyCode: jest.fn().mockResolvedValue({ error: null }),
      },
      finalize: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

jest.mock("../hooks/useAuth", () => ({
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
    isConfigured: false,
  }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInCreate.mockResolvedValue({ error: null });
    mockSendCode.mockResolvedValue({ error: null });
  });

  it("sends OTP and routes to verify screen on submit", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    fireEvent.press(screen.getByText("Request Magic Link"));

    await waitFor(() => {
      expect(mockSignInCreate).toHaveBeenCalledWith({ identifier: "ada@example.com" });
      expect(mockSendCode).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/(auth)/otp",
          params: expect.objectContaining({ email: "ada@example.com", source: "sign-in" }),
        })
      );
    });
  });

  it("shows inline error when Clerk rejects the sign-in", async () => {
    mockSignInCreate.mockResolvedValue({
      error: { message: "No account found.", longMessage: "No account found with that email." },
    });

    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByLabelText("Email"), "unknown@example.com");
    fireEvent.press(screen.getByText("Request Magic Link"));

    await waitFor(() => {
      expect(screen.getByText("No account found with that email.")).toBeTruthy();
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("triggers Google sign-in when the button is pressed", () => {
    const screen = render(<SignInScreen />);
    fireEvent.press(screen.getByText("Continue with Google"));
    expect(mockGoogleMutate).toHaveBeenCalled();
  });

  it("hides the Apple button when Apple is not configured", () => {
    const screen = render(<SignInScreen />);
    expect(screen.queryByText("Continue with Apple ID")).toBeNull();
  });

  it("routes the sign-up link directly to email sign-up", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Sign Up"));

    expect(router.replace).toHaveBeenCalledWith("/(auth)/email");
    expect(router.push).not.toHaveBeenCalledWith("/(auth)/welcome");
  });
});
