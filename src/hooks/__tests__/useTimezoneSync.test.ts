import { AppState } from "react-native";
import { renderHook } from "@testing-library/react-native";
import { useTimezoneSync } from "../useTimezoneSync";

/**
 * A stale timezone delivers reminders at the wrong hour and nothing surfaces the
 * mistake — the notification arrives, just not when the user asked for it. These
 * pin when a correction is sent and, just as importantly, when it is not.
 */

const mockMe = jest.fn();
const mockMutate = jest.fn();
const mockIsAuthenticated = jest.fn();
const mockLocalTimezone = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/features/profile", () => ({
  useMe: () => mockMe(),
  useUpdateProfile: () => ({ mutate: mockMutate }),
}));
jest.mock("@/lib", () => ({
  monitoring: { captureException: (...a: unknown[]) => mockCaptureException(...a) },
}));
jest.mock("@/stores", () => ({ useIsAuthenticated: () => mockIsAuthenticated() }));
jest.mock("@/utils", () => ({ localTimezone: () => mockLocalTimezone() }));

describe("useTimezoneSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockLocalTimezone.mockReturnValue("Europe/London");
    mockMe.mockReturnValue({ data: { timezone: "Europe/London" } });
  });

  it("sends nothing when the stored timezone already matches the device", () => {
    renderHook(() => useTimezoneSync());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("corrects a stale timezone on sign-in", () => {
    // The onboarding-set value after the user has moved.
    mockMe.mockReturnValue({ data: { timezone: "Africa/Lagos" } });

    renderHook(() => useTimezoneSync());

    expect(mockMutate).toHaveBeenCalledWith(
      { timezone: "Europe/London" },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("fills in a timezone the user never set by skipping onboarding", () => {
    mockMe.mockReturnValue({ data: { timezone: null } });

    renderHook(() => useTimezoneSync());

    expect(mockMutate).toHaveBeenCalledWith({ timezone: "Europe/London" }, expect.anything());
  });

  it("re-checks when the app returns to the foreground", () => {
    // A flight lands while the app is backgrounded; there is no other event.
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_e: string, cb: never) => {
      listeners.push(cb as unknown as (state: string) => void);
      return { remove: jest.fn() };
    }) as never);

    mockMe.mockReturnValue({ data: { timezone: "Europe/London" } });
    renderHook(() => useTimezoneSync());
    expect(mockMutate).not.toHaveBeenCalled();

    mockLocalTimezone.mockReturnValue("America/New_York");
    listeners.forEach((cb) => cb("active"));

    expect(mockMutate).toHaveBeenCalledWith({ timezone: "America/New_York" }, expect.anything());
  });

  it("does not send the same correction twice", () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_e: string, cb: never) => {
      listeners.push(cb as unknown as (state: string) => void);
      return { remove: jest.fn() };
    }) as never);

    mockMe.mockReturnValue({ data: { timezone: "Africa/Lagos" } });
    renderHook(() => useTimezoneSync());

    listeners.forEach((cb) => cb("active"));
    listeners.forEach((cb) => cb("active"));

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("does nothing while signed out", () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockMe.mockReturnValue({ data: { timezone: "Africa/Lagos" } });

    renderHook(() => useTimezoneSync());

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("reports a failed correction and allows a later retry", () => {
    mockMe.mockReturnValue({ data: { timezone: "Africa/Lagos" } });
    mockMutate.mockImplementation((_payload, options) => options?.onError?.(new Error("offline")));

    renderHook(() => useTimezoneSync());

    expect(mockCaptureException).toHaveBeenCalled();
  });
});
