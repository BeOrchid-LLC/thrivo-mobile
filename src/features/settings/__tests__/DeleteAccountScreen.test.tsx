import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { DeleteAccountScreen } from "../screens/DeleteAccountScreen";

/**
 * The screen's job is to make an irreversible action deliberate: nothing is
 * deleted until the user has read what they lose and proved it is them.
 */

const mockSendCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockDeleteMutate = jest.fn();
const mockIsPremium = jest.fn();
let mockReauthError: string | null = null;

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("../hooks/useReauthentication", () => ({
  useReauthentication: () => ({
    email: "user@example.com",
    step: "idle",
    error: mockReauthError,
    sendCode: mockSendCode,
    verifyCode: mockVerifyCode,
    clearError: jest.fn(),
  }),
}));

jest.mock("../hooks/useDeleteAccount", () => ({
  useDeleteAccount: () => ({ mutate: mockDeleteMutate, isPending: false, isError: false }),
}));

jest.mock("@/hooks", () => ({
  useEntitlement: () => ({ isPremium: mockIsPremium(), isLoading: false }),
}));

jest.mock("@/lib", () => ({
  subscription: { getManagementUrl: jest.fn().mockResolvedValue(null) },
}));

async function advanceToCodeEntry(screen: ReturnType<typeof render>) {
  fireEvent.press(screen.getByText("Continue"));
  await waitFor(() => expect(screen.getByLabelText("Verification code")).toBeTruthy());
}

describe("DeleteAccountScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauthError = null;
    mockIsPremium.mockReturnValue(false);
    mockSendCode.mockResolvedValue(true);
    mockVerifyCode.mockResolvedValue(true);
  });

  it("states what is deleted before offering to continue", () => {
    const screen = render(<DeleteAccountScreen />);

    expect(screen.getByText("What gets deleted")).toBeTruthy();
    expect(screen.getByText(/Every food, water, weight, and check-in entry/)).toBeTruthy();
    expect(screen.getByText(/This cannot be undone/)).toBeTruthy();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("warns premium users that deletion does not cancel billing", () => {
    // Without this the user deletes their account and keeps getting charged.
    mockIsPremium.mockReturnValue(true);
    const screen = render(<DeleteAccountScreen />);

    expect(screen.getByText("Active store subscription")).toBeTruthy();
    expect(screen.getByText(/does not cancel Apple or Google billing/)).toBeTruthy();
  });

  it("omits the billing warning for free users", () => {
    const screen = render(<DeleteAccountScreen />);

    expect(screen.queryByText("Active store subscription")).toBeNull();
  });

  it("leaves without deleting when the user keeps their account", () => {
    const screen = render(<DeleteAccountScreen />);

    fireEvent.press(screen.getByText("Keep my account"));

    expect(router.back).toHaveBeenCalled();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("requires a full code before the delete button becomes usable", async () => {
    const screen = render(<DeleteAccountScreen />);
    await advanceToCodeEntry(screen);

    fireEvent.changeText(screen.getByLabelText("Verification code"), "123");
    fireEvent.press(screen.getByText("Delete my account"));

    expect(mockVerifyCode).not.toHaveBeenCalled();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("deletes only after the code verifies, then leaves for the auth screens", async () => {
    const screen = render(<DeleteAccountScreen />);
    await advanceToCodeEntry(screen);

    fireEvent.changeText(screen.getByLabelText("Verification code"), "123456");
    fireEvent.press(screen.getByText("Delete my account"));

    await waitFor(() => expect(mockDeleteMutate).toHaveBeenCalled());
    expect(mockVerifyCode).toHaveBeenCalledWith("123456");

    mockDeleteMutate.mock.calls[0][1].onSuccess();
    expect(router.replace).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("does not delete when the verification code is rejected", async () => {
    mockVerifyCode.mockResolvedValue(false);
    const screen = render(<DeleteAccountScreen />);
    await advanceToCodeEntry(screen);

    fireEvent.changeText(screen.getByLabelText("Verification code"), "000000");
    fireEvent.press(screen.getByText("Delete my account"));

    await waitFor(() => expect(mockVerifyCode).toHaveBeenCalled());
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("stays on the review stage when the code could not be sent", async () => {
    mockSendCode.mockResolvedValue(false);
    const screen = render(<DeleteAccountScreen />);

    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => expect(mockSendCode).toHaveBeenCalled());
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(screen.getByText("What gets deleted")).toBeTruthy();
  });
});
