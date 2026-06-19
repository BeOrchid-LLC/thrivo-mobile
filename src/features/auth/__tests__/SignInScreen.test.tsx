import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SignInScreen } from "../screens/SignInScreen";

const mockRequestMagicLink = jest.fn();
const mockGoogleMutate = jest.fn();
const mockAppleMutate = jest.fn();

jest.mock("../hooks/useAuth", () => ({
  useRequestMagicLink: () => ({
    mutateAsync: mockRequestMagicLink,
    isPending: false,
    error: null,
  }),
  useGoogleSignIn: () => ({
    mutate: mockGoogleMutate,
    isPending: false,
    error: null,
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
    mockRequestMagicLink.mockResolvedValue({ status: true });
  });

  it("requests a real magic link and shows the sent state", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "ada@example.com");
    fireEvent.press(screen.getByText("Request magic link"));

    await waitFor(() =>
      expect(mockRequestMagicLink).toHaveBeenCalledWith({ email: "ada@example.com" })
    );
    expect(screen.getByText("Check your email")).toBeTruthy();
    expect(screen.getByText("Resend in 60s")).toBeTruthy();
  });

  it("blocks the magic-link request and shows a validation error for an invalid email", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "not-an-email");
    fireEvent.press(screen.getByText("Request magic link"));

    await waitFor(() => expect(screen.getByText("Invalid email")).toBeTruthy());
    expect(mockRequestMagicLink).not.toHaveBeenCalled();
  });

  it("routes social button presses through the real social hooks", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Continue with Google"));

    expect(mockGoogleMutate).toHaveBeenCalledTimes(1);
  });
});
