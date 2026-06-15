import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SignInScreen } from "../screens/SignInScreen";
import { setToken } from "@/lib";
import { useSessionStore } from "@/stores";

// Mock the device seams; everything else (form, store, demo hook) runs for real.
jest.mock("@/lib", () => ({
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
  analytics: { identify: jest.fn(), reset: jest.fn() },
}));

const mockSetToken = setToken as jest.MockedFunction<typeof setToken>;

describe("Phase 6 — SignInScreen (demo auth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().actions.clearSession();
  });

  it("fabricates an un-onboarded session on magic-link request (demo, no network)", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "ada@example.com");
    fireEvent.press(screen.getByText("Request magic link"));

    await waitFor(() => expect(mockSetToken).toHaveBeenCalled());

    const state = useSessionStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.userId).toBe("demo-user");
    // New demo users start un-onboarded so the guard routes into onboarding.
    expect(state.isOnboarded).toBe(false);
  });

  it("blocks the magic-link request and shows a validation error for an invalid email", async () => {
    const screen = render(<SignInScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "not-an-email");
    fireEvent.press(screen.getByText("Request magic link"));

    await waitFor(() => expect(screen.getByText("Invalid email")).toBeTruthy());
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("unauthenticated");
  });
});
