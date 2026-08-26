import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { FoodItem } from "@/contracts";
import { useFavoritesStore, useSessionStore } from "@/stores";
import { ScanBarcodeScreen } from "../screens/ScanBarcodeScreen";

const mockUseBarcodeLookup = jest.fn();
const mockUseLogFood = jest.fn();
const mockUseFoodDetail = jest.fn();
const mockUseFavorites = jest.fn();
const mockUseAddFavorite = jest.fn();
const mockUseRemoveFavorite = jest.fn();
const mockUseToggleFavorite = jest.fn();
const mockCameraScan = jest.fn();
const mockIsNetworkReachable = jest.fn(async () => true);
const mockQueueBarcodeScan = jest.fn();
const mockReadQueuedBarcodeScans = jest.fn(async (..._args: unknown[]) => [] as unknown[]);
const mockRemoveQueuedBarcodeScan = jest.fn();
const mockTrack = jest.fn();

jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return {
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned?: (result: unknown) => void }) => {
      mockCameraScan.mockImplementation(() =>
        onBarcodeScanned?.({ data: "1234567890123", raw: "1234567890123", type: "ean13" })
      );
      return <View testID="camera-view" />;
    },
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: () => <View testID="time-picker" /> };
});

jest.mock("@/lib", () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
  isNetworkReachable: () => mockIsNetworkReachable(),
  queueBarcodeScan: (...args: unknown[]) => mockQueueBarcodeScan(...args),
  readQueuedBarcodeScans: (...args: unknown[]) => mockReadQueuedBarcodeScans(...args),
  removeQueuedBarcodeScan: (...args: unknown[]) => mockRemoveQueuedBarcodeScan(...args),
}));

jest.mock("../hooks/useFoodLogging", () => ({
  useBarcodeLookup: (barcode: string | null) => mockUseBarcodeLookup(barcode),
  useLogFood: () => mockUseLogFood(),
  useFoodDetail: (...args: unknown[]) => mockUseFoodDetail(...args),
  useFavorites: () => mockUseFavorites(),
  useAddFavorite: () => mockUseAddFavorite(),
  useRemoveFavorite: () => mockUseRemoveFavorite(),
  useToggleFavorite: () => mockUseToggleFavorite(),
}));

jest.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ isPremium: true, isLoading: false }),
}));

const food: FoodItem = {
  id: "food-1",
  name: "Chicken breast, grilled",
  brand: null,
  barcode: null,
  source: "authoritative",
  servingLabel: "100g",
  servingGrams: 100,
  nutrients: { calories: 165, proteinG: 31, carbsG: 0, fatG: 4 },
  servingOptions: [],
  isPersonal: false,
  isEstimated: false,
};

const successQuery = <T,>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
});

const renderScreen = () => render(<ScanBarcodeScreen day="2026-06-21" onBack={jest.fn()} />);

describe("ScanBarcodeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ favoriteIds: [] });
    // The session store is module state; a test that signs someone in would
    // otherwise leave them signed in for every test after it.
    useSessionStore.setState({ userId: null });
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food: null }));
    mockUseLogFood.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
      reset: jest.fn(),
    });
    mockUseFoodDetail.mockReturnValue({ data: undefined, isLoading: false });
    mockUseFavorites.mockReturnValue(successQuery({ items: [] }));
    mockUseAddFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveFavorite.mockReturnValue({ mutate: jest.fn() });
    mockUseToggleFavorite.mockReturnValue(jest.fn());
    mockIsNetworkReachable.mockResolvedValue(true);
    mockQueueBarcodeScan.mockResolvedValue(undefined);
    mockReadQueuedBarcodeScans.mockResolvedValue([]);
  });

  it("toggles favorite on a scanned food", () => {
    const toggleFavorite = jest.fn();
    mockUseToggleFavorite.mockReturnValue(toggleFavorite);
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food }));

    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Add favorite"));

    expect(toggleFavorite).toHaveBeenCalledWith(food.id);
  });

  it("opens the log sheet for a scanned food instead of logging immediately", () => {
    const mutate = jest.fn();
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food }));
    mockUseLogFood.mockReturnValue({ mutate, isPending: false, error: null, reset: jest.fn() });

    const screen = renderScreen();
    fireEvent.press(screen.getByLabelText("Log Chicken breast, grilled"));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText("Log food")).toBeTruthy();

    fireEvent.press(screen.getByText("Log food"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ foodItemId: food.id, servings: 1 }),
      expect.any(Object)
    );
  });

  it("captures a barcode from the camera scanner", () => {
    const screen = renderScreen();
    act(() => {
      mockCameraScan();
    });

    return waitFor(() => {
      expect(screen.getByText("Captured barcode")).toBeTruthy();
      expect(mockUseBarcodeLookup).toHaveBeenLastCalledWith("1234567890123");
      // Funnel step is the decode itself, not the lookup result.
      expect(mockTrack).toHaveBeenCalledWith("thrivo.barcode_scanned", expect.objectContaining({}));
    });
  });

  it("queues a captured barcode while offline, against the signed-in user", async () => {
    mockIsNetworkReachable.mockResolvedValue(false);
    useSessionStore.setState({ userId: "user-1" });

    const screen = renderScreen();
    act(() => {
      mockCameraScan();
    });

    await waitFor(() => {
      // Owner-scoped, so it can never replay into another account.
      expect(mockQueueBarcodeScan).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ barcode: "1234567890123", format: "ean13" })
      );
      expect(screen.getByText(/saved for lookup later/i)).toBeTruthy();
    });
  });

  it("replays a queued offline scan once the session id arrives", async () => {
    // `userId` lands only after Clerk restores and GET /users/me resolves, so a
    // cold start into this screen renders with none. The replay has to re-run
    // when it appears — otherwise the queued scan sits in storage forever and
    // nothing surfaces the failure.
    mockReadQueuedBarcodeScans.mockResolvedValue([
      { barcode: "1234567890123", format: "ean13", scannedAt: new Date().toISOString() },
    ]);

    const screen = renderScreen();

    await act(async () => {
      useSessionStore.setState({ userId: "user-1" });
    });

    await waitFor(() => {
      expect(mockReadQueuedBarcodeScans).toHaveBeenCalledWith("user-1");
      expect(screen.getByText("Replaying an offline scan.")).toBeTruthy();
      expect(mockUseBarcodeLookup).toHaveBeenLastCalledWith("1234567890123");
    });
  });

  it("clears the replayed scan from the queue once the lookup resolves", async () => {
    mockReadQueuedBarcodeScans.mockResolvedValue([
      { barcode: "1234567890123", format: "ean13", scannedAt: new Date().toISOString() },
    ]);
    mockUseBarcodeLookup.mockReturnValue(successQuery({ food }));
    useSessionStore.setState({ userId: "user-1" });

    renderScreen();

    await waitFor(() =>
      expect(mockRemoveQueuedBarcodeScan).toHaveBeenCalledWith("user-1", "1234567890123")
    );
  });
});
