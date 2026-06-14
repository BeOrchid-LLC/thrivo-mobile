import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SignInScreen } from "../screens/SignInScreen";
import { callApi } from "@/api";
import { setToken } from "@/lib";
import { useSessionStore } from "@/stores";

// Mock the network + device seams; everything else runs for real.
jest.mock("@/api", () => ({
  callApi: jest.fn(),
  isApiError: (e: unknown) => e instanceof Error && e.name === "ApiError",
}));
jest.mock("@/lib", () => ({
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
  analytics: { identify: jest.fn(), reset: jest.fn() },
}));

const mockCallApi = callApi as jest.MockedFunction<typeof callApi>;
const mockSetToken = setToken as jest.MockedFunction<typeof setToken>;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const session = {
  token: "tok_abc",
  user: {
    id: "u_1",
    email: "ada@example.com",
    name: "Ada",
    goal: null,
    unitSystem: "metric",
    onboardingStep: null,
    isOnboarded: true,
    targets: null,
    createdAt: "2026-06-14T00:00:00.000Z",
  },
};

describe("Phase 6 — SignInScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().actions.clearSession();
  });

  it("persists the token and authenticates the session on successful sign-in", async () => {
    mockCallApi.mockResolvedValueOnce(session as never);
    const screen = render(<SignInScreen />, { wrapper });

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "ada@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("••••••••"), "password123");
    fireEvent.press(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(mockCallApi).toHaveBeenCalledWith("PASSWORD_SIGNIN", {
        payload: { email: "ada@example.com", password: "password123" },
      });
    });
    await waitFor(() => expect(mockSetToken).toHaveBeenCalledWith("tok_abc"));

    const state = useSessionStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.userId).toBe("u_1");
    expect(state.isOnboarded).toBe(true);
  });

  it("blocks submit and shows validation errors for invalid input", async () => {
    const screen = render(<SignInScreen />, { wrapper });

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "not-an-email");
    fireEvent.changeText(screen.getByPlaceholderText("••••••••"), "short");
    fireEvent.press(screen.getByText("Sign in"));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeTruthy();
    });
    expect(mockCallApi).not.toHaveBeenCalled();
  });
});
