import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import NotificationsStep from "../screens/NotificationsStep";

const mockTrack = jest.fn();
const mockSubmit = jest.fn();
const mockRegister = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/lib", () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
  registerForPushNotifications: (...args: unknown[]) => mockRegister(...args),
}));

jest.mock("@/features/onboarding/hooks/useCompleteOnboarding", () => ({
  useSubmitOnboarding: () => ({ submit: mockSubmit, isPending: false }),
}));

jest.mock("@/features/onboarding/hooks/useOnboardingPrefill", () => ({
  useOnboardingPrefill: () => ({ draft: { notifyTimes: ["08:00", "20:00"] } }),
}));

jest.mock("@/stores", () => ({
  useOnboardingDraftActions: () => ({ setFields: jest.fn() }),
  useSessionActions: () => ({ setIsOnboardingSkipped: jest.fn() }),
}));

/**
 * The step seeds its picker state from the draft inside an effect, so a bare
 * `render` settles one tick after it returns. Flushing here keeps the act()
 * warning out of every assertion below.
 */
async function renderStep(props: Record<string, unknown> = {}) {
  const screen = render(<NotificationsStep {...props} />);
  await act(async () => {});
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue(undefined);
  mockRegister.mockResolvedValue("token");
});

describe("NotificationsStep analytics", () => {
  it("emits thrivo.reminder_set once the schedule is saved", async () => {
    const screen = await renderStep();
    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith("thrivo.reminder_set", {
        // Distinguishes this screen from the Settings pickers, which write a
        // different field — see docs/reminder-scheduling-design.md.
        reminder: "notifyTimes",
        count: 2,
      })
    );
  });

  it("emits from the Settings revisit path too", async () => {
    const onNext = jest.fn().mockResolvedValue(undefined);
    const screen = await renderStep({ mode: "revisit", onNext });
    fireEvent.press(screen.getByText("Save and finish"));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(mockTrack).toHaveBeenCalledWith(
      "thrivo.reminder_set",
      expect.objectContaining({ reminder: "notifyTimes" })
    );
  });

  it("does not emit when the save fails", async () => {
    mockSubmit.mockRejectedValue(new Error("offline"));

    const screen = await renderStep();
    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() =>
      expect(screen.getByText("We couldn't save your reminder preferences. Please try again."))
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does not emit when the step is skipped", async () => {
    const screen = await renderStep();
    fireEvent.press(screen.getByText("Skip for now"));

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("still saves when the push permission prompt is declined", async () => {
    // Permission denial must not block the schedule — nor swallow the event.
    mockRegister.mockRejectedValue(new Error("denied"));

    const screen = await renderStep();
    fireEvent.press(screen.getByText("Enable notifications"));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockTrack).toHaveBeenCalledWith(
      "thrivo.reminder_set",
      expect.objectContaining({ reminder: "notifyTimes" })
    );
  });
});
