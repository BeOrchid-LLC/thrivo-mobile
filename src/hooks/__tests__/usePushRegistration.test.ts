import { AppState } from "react-native";
import { renderHook, waitFor } from "@testing-library/react-native";
import { usePushRegistration } from "../usePushRegistration";

/**
 * Every failure here is silent: the token goes stale, pushes keep being sent to
 * a dead address, and the user simply stops getting reminders with nothing to
 * report. These pin when we re-register — and that we never prompt.
 */

const mockSync = jest.fn();
const mockAddTokenListener = jest.fn();
const mockCaptureException = jest.fn();
const mockIsAuthenticated = jest.fn();
const mockUnsubscribe = jest.fn();

const mockMe = jest.fn();
jest.mock("@/features/profile", () => ({ useMe: () => mockMe() }));

jest.mock("@/lib", () => ({
  syncPushRegistration: (...a: unknown[]) => mockSync(...a),
  addPushTokenChangeListener: (...a: unknown[]) => mockAddTokenListener(...a),
  monitoring: { captureException: (...a: unknown[]) => mockCaptureException(...a) },
}));
jest.mock("@/stores", () => ({ useIsAuthenticated: () => mockIsAuthenticated() }));

function captureAppStateListeners() {
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation(((_e: string, cb: never) => {
    listeners.push(cb as unknown as (state: string) => void);
    return { remove: jest.fn() };
  }) as never);
  return listeners;
}

describe("usePushRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockSync.mockResolvedValue("ExponentPushToken[abc]");
    mockAddTokenListener.mockReturnValue(mockUnsubscribe);
    mockMe.mockReturnValue({ data: { notifyTimes: ["08:00:00", "20:00:00"] } });
  });

  it("registers on sign-in, covering users who skipped onboarding", async () => {
    renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));
  });

  it("re-sends the reminder schedule so re-registering cannot wipe it", async () => {
    // `notifyTimes` is optional in the payload; omitting it risks a backend
    // treating absence as "clear", erasing reminders on every foreground.
    renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockSync).toHaveBeenCalledWith(["08:00", "20:00"]));
  });

  it("does not re-register when the hook re-renders without profile changes", async () => {
    const { rerender } = renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));
    rerender({});

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it("sends no schedule for a user who has not set one", async () => {
    mockMe.mockReturnValue({ data: { notifyTimes: null } });

    renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockSync).toHaveBeenCalledWith(undefined));
  });

  it("re-registers when the token rotates", async () => {
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(mockAddTokenListener).toHaveBeenCalled());

    // Reinstall / restore-from-backup issues a new token.
    const onRotate = mockAddTokenListener.mock.calls[0][0] as () => void;
    onRotate();

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(2));
  });

  it("re-checks on foreground, catching permission granted in iOS Settings", async () => {
    const listeners = captureAppStateListeners();
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));

    listeners.forEach((cb) => cb("active"));

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(2));
  });

  it("does nothing while signed out", () => {
    mockIsAuthenticated.mockReturnValue(false);

    renderHook(() => usePushRegistration());

    expect(mockSync).not.toHaveBeenCalled();
    expect(mockAddTokenListener).not.toHaveBeenCalled();
  });

  it("stays quiet to the user but reports a failed registration", async () => {
    mockSync.mockRejectedValue(new Error("network"));

    renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
  });

  it("tolerates permission not being granted", async () => {
    // syncPushRegistration resolves null rather than throwing when denied.
    mockSync.mockResolvedValue(null);

    renderHook(() => usePushRegistration());

    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount so a signed-out session keeps no listeners", async () => {
    const { unmount } = renderHook(() => usePushRegistration());
    await waitFor(() => expect(mockAddTokenListener).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
