import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { storageKeys } from "@/lib/storage";
import {
  useBiometricUnlockStore,
  usePreferencesStore,
  useSessionStore,
} from "@/stores";
import { WelcomeScreen } from "../screens/WelcomeScreen";

const mockGoogleMutate = jest.fn();
const mockAppleMutate = jest.fn();
const mockBiometricAvailable = jest.fn();
const mockAuthenticateBiometric = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
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
    isConfigured: true,
  }),
}));

jest.mock("@/lib/biometric", () => ({
  isBiometricAvailable: () => mockBiometricAvailable(),
  authenticateBiometric: () => mockAuthenticateBiometric(),
}));

function getButtonByText(screen: ReturnType<typeof render>, label: string) {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText(label);
  while (node && node.props.accessibilityRole !== "button") {
    node = node.parent;
  }
  if (!node) throw new Error(`Could not find button for ${label}`);
  return node;
}

describe("WelcomeScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockBiometricAvailable.mockResolvedValue(false);
    mockAuthenticateBiometric.mockResolvedValue(true);
    useSessionStore.setState({
      status: "unauthenticated",
      token: null,
      userId: null,
      accountStatus: null,
      isOnboarded: false,
      isOnboardingSkipped: false,
    });
    usePreferencesStore.setState({ biometricAuthEnabled: false, hasHydrated: true });
    useBiometricUnlockStore.setState({ isBiometricUnlocked: false });
  });

  it("routes first-ever device opens to email sign up", async () => {
    const screen = render(<WelcomeScreen />);

    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(storageKeys.deviceHasOpened, "true")
    );

    fireEvent.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/email");
  });

  it("routes returning device opens to email sign in", async () => {
    await AsyncStorage.setItem(storageKeys.deviceHasOpened, "true");

    const screen = render(<WelcomeScreen />);

    await waitFor(() =>
      expect(getButtonByText(screen, "Continue with email").props.accessibilityState.disabled).toBe(
        false
      )
    );
    fireEvent.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("auto-prompts biometric unlock for saved onboarded sessions", async () => {
    mockBiometricAvailable.mockResolvedValue(true);
    useSessionStore.setState({
      status: "authenticated",
      token: "token",
      userId: "user-1",
      accountStatus: "free_plan",
      isOnboarded: true,
      isOnboardingSkipped: false,
    });
    usePreferencesStore.setState({ biometricAuthEnabled: true, hasHydrated: true });

    render(<WelcomeScreen />);

    await waitFor(() => expect(mockAuthenticateBiometric).toHaveBeenCalledTimes(1));
    expect(useBiometricUnlockStore.getState().isBiometricUnlocked).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/(app)/dashboard");
  });

  it("routes biometric unlock to onboarding when the saved session still needs it", async () => {
    mockBiometricAvailable.mockResolvedValue(true);
    useSessionStore.setState({
      status: "authenticated",
      token: "token",
      userId: "user-1",
      accountStatus: "free_plan",
      isOnboarded: false,
      isOnboardingSkipped: false,
    });
    usePreferencesStore.setState({ biometricAuthEnabled: true, hasHydrated: true });

    render(<WelcomeScreen />);

    await waitFor(() => expect(mockAuthenticateBiometric).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith("/(onboarding)/name");
  });

  it("keeps regular auth usable when biometric unlock is cancelled", async () => {
    await AsyncStorage.setItem(storageKeys.deviceHasOpened, "true");
    mockBiometricAvailable.mockResolvedValue(true);
    mockAuthenticateBiometric.mockResolvedValue(false);
    useSessionStore.setState({
      status: "authenticated",
      token: "token",
      userId: "user-1",
      accountStatus: "free_plan",
      isOnboarded: true,
      isOnboardingSkipped: false,
    });
    usePreferencesStore.setState({ biometricAuthEnabled: true, hasHydrated: true });

    const screen = render(<WelcomeScreen />);

    await waitFor(() => expect(mockAuthenticateBiometric).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Unlock with phone")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(getButtonByText(screen, "Continue with email").props.accessibilityState.disabled).toBe(
        false
      )
    );
    fireEvent.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/sign-in");
  });
});
