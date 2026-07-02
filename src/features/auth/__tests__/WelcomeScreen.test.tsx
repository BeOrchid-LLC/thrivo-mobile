import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { storageKeys } from "@/lib/storage";
import { WelcomeScreen } from "../screens/WelcomeScreen";

const mockGoogleMutate = jest.fn();
const mockAppleMutate = jest.fn();

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

describe("WelcomeScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
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

    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2));
    fireEvent.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/sign-in");
  });
});
