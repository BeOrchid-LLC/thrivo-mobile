import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { OtpRequestScreen } from "../screens/OtpRequestScreen";

const mockRequestOtp = jest.fn();
const mockSetFields = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("../hooks/useAuth", () => ({
  useRequestOtp: () => ({
    mutateAsync: mockRequestOtp,
    isPending: false,
    error: null,
  }),
}));

jest.mock("@/stores", () => ({
  useOnboardingDraftActions: () => ({ setFields: mockSetFields }),
}));

describe("OtpRequestScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestOtp.mockResolvedValue(null);
  });

  it("stores the full name draft and routes to OTP", async () => {
    const screen = render(<OtpRequestScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Ada Lovelace"), "Ada Lovelace");
    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "ada@example.com");
    fireEvent.press(screen.getByText("Send code"));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({ email: "ada@example.com" }));
    expect(mockSetFields).toHaveBeenCalledWith({ firstName: "Ada Lovelace", onboardingStep: 1 });
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(auth)/otp",
      params: { email: "ada@example.com", source: "email" },
    });
  });
});
