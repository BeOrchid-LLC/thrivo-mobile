import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { OtpRequestScreen } from "../screens/OtpRequestScreen";

const mockSignUpCreate = jest.fn();
const mockSendEmailCode = jest.fn();
const mockSetFields = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useSignUp: () => ({
    signUp: {
      create: mockSignUpCreate,
      verifications: {
        sendEmailCode: mockSendEmailCode,
        verifyEmailCode: jest.fn().mockResolvedValue({ error: null }),
      },
      finalize: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

jest.mock("@/stores", () => ({
  useAuthStatus: () => "unauthenticated",
  useOnboardingDraftActions: () => ({ setFields: mockSetFields }),
}));

describe("OtpRequestScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUpCreate.mockResolvedValue({ error: null });
    mockSendEmailCode.mockResolvedValue({ error: null });
  });

  it("creates a sign-up and navigates to OTP screen on submit", async () => {
    const screen = render(<OtpRequestScreen />);

    fireEvent.changeText(screen.getByLabelText("Name"), "Ada Lovelace");
    fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalledWith(
        expect.objectContaining({ emailAddress: "ada@example.com" })
      );
      expect(mockSendEmailCode).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/(auth)/otp",
          params: expect.objectContaining({ email: "ada@example.com", source: "email" }),
        })
      );
    });
  });

  it("stores the name draft before navigating", async () => {
    const screen = render(<OtpRequestScreen />);

    fireEvent.changeText(screen.getByLabelText("Name"), "Ada Lovelace");
    fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => {
      expect(mockSetFields).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Ada Lovelace" })
      );
    });
  });

  it("routes the sign-in link to the email sign-in screen", () => {
    const screen = render(<OtpRequestScreen />);

    fireEvent.press(screen.getByText("Sign in"));

    expect(router.replace).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("shows an error when Clerk returns an API error", async () => {
    mockSignUpCreate.mockResolvedValue({
      error: { message: "Email taken.", longMessage: "Email address is already taken." },
    });

    const screen = render(<OtpRequestScreen />);

    fireEvent.changeText(screen.getByLabelText("Name"), "Ada");
    fireEvent.changeText(screen.getByLabelText("Email"), "ada@example.com");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => {
      expect(screen.getByText("Email address is already taken.")).toBeTruthy();
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
