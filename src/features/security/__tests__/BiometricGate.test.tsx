import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import { BiometricGate } from "../BiometricGate";

const mockEnabled = jest.fn();
const mockAuthenticated = jest.fn();
jest.mock("@/stores", () => ({
  useBiometricAuthEnabled: () => mockEnabled(),
  useIsAuthenticated: () => mockAuthenticated(),
}));

const mockAvailable = jest.fn();
const mockAuthenticate = jest.fn();
jest.mock("@/lib", () => ({
  isBiometricAvailable: () => mockAvailable(),
  authenticateBiometric: () => mockAuthenticate(),
}));

const child = <Text>protected content</Text>;

// Flush the gate's async unlock chain (two awaited promises) inside act so React
// commits the resulting state before we assert.
const flush = () => act(async () => undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mockAvailable.mockResolvedValue(true);
  mockAuthenticate.mockResolvedValue(true);
});

describe("BiometricGate", () => {
  it("does not lock when the feature is disabled", async () => {
    mockEnabled.mockReturnValue(false);
    mockAuthenticated.mockReturnValue(true);
    const { queryByText, getByText } = render(<BiometricGate>{child}</BiometricGate>);
    await flush();
    expect(getByText("protected content")).toBeTruthy();
    expect(queryByText("Thrivo is locked")).toBeNull();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("locks on mount and auto-unlocks after a successful biometric match", async () => {
    mockEnabled.mockReturnValue(true);
    mockAuthenticated.mockReturnValue(true);

    const { queryByText } = render(<BiometricGate>{child}</BiometricGate>);
    expect(queryByText("Thrivo is locked")).toBeTruthy(); // locked before unlock resolves
    await flush();

    expect(mockAuthenticate).toHaveBeenCalled();
    expect(queryByText("Thrivo is locked")).toBeNull();
  });

  it("stays locked while the biometric match fails", async () => {
    mockEnabled.mockReturnValue(true);
    mockAuthenticated.mockReturnValue(true);
    mockAuthenticate.mockResolvedValue(false);

    const { getByText } = render(<BiometricGate>{child}</BiometricGate>);
    await flush();

    expect(mockAuthenticate).toHaveBeenCalled();
    expect(getByText("Thrivo is locked")).toBeTruthy();
  });

  it("fails open when the device has no enrolled biometric", async () => {
    mockEnabled.mockReturnValue(true);
    mockAuthenticated.mockReturnValue(true);
    mockAvailable.mockResolvedValue(false);

    const { queryByText } = render(<BiometricGate>{child}</BiometricGate>);
    await flush();

    expect(queryByText("Thrivo is locked")).toBeNull();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });
});
