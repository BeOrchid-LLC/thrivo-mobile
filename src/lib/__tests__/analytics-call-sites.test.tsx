import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, waitFor } from "@testing-library/react-native";

/**
 * Proves the funnel by *running* each call site, not by grepping for strings.
 *
 * A source scan cannot tell the difference between an event that fires and one
 * that sits behind a condition that is never true, and it cannot check that the
 * event fires at the right moment. These invoke the real code paths.
 */

const mockTrack = jest.fn();

jest.mock("@/lib/analytics", () => ({
  analytics: { track: (...a: unknown[]) => mockTrack(...a) },
}));
jest.mock("@/lib", () => ({
  analytics: { track: (...a: unknown[]) => mockTrack(...a) },
  newIdempotencyKey: () => "idem-1",
}));

const mockCreateCheckin = jest.fn();
jest.mock("@/features/checkin/api/checkin.api", () => ({
  createCheckin: (...a: unknown[]) => mockCreateCheckin(...a),
  getCheckins: jest.fn(),
}));

const mockUpdateProfile = jest.fn();
const mockUpdateSettings = jest.fn();
jest.mock("@/features/profile", () => ({
  useMe: () => ({ data: { onboardingStep: 7 } }),
  useUpdateProfile: () => ({ mutateAsync: mockUpdateProfile, isPending: false, error: null }),
}));
jest.mock("@/features/settings", () => ({
  useUpdateSettings: () => ({ mutateAsync: mockUpdateSettings, isPending: false, error: null }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("analytics call sites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateCheckin.mockResolvedValue({});
    mockUpdateProfile.mockResolvedValue({});
    mockUpdateSettings.mockResolvedValue({});
  });

  it("emits thrivo.checkin_submitted when a check-in is created", async () => {
    const { useCreateCheckin } = require("@/features/checkin/hooks/useCheckin");
    const { result } = renderHook(() => useCreateCheckin(), { wrapper });

    result.current.mutate({ mood: "low" });

    await waitFor(() => expect(mockTrack).toHaveBeenCalledWith("thrivo.checkin_submitted"));
  });

  it("emits thrivo.onboarding_completed only on the final step", async () => {
    const { useSaveOnboardingStep } = require("@/features/onboarding/hooks/useSaveOnboardingStep");
    const { result } = renderHook(() => useSaveOnboardingStep(), { wrapper });

    // An intermediate save is progress, not conversion.
    await result.current.save({ name: "Dior" }, 3);
    expect(mockTrack).not.toHaveBeenCalled();

    await result.current.save({ name: "Dior" }, 8, true);
    expect(mockTrack).toHaveBeenCalledWith("thrivo.onboarding_completed");
  });

  it("emits thrivo.food_logged for a catalog log, including replayed offline writes", async () => {
    // Asserted against the registered mutation default, which is the path both a
    // live tap and a queued write replayed on reconnect go through.
    const { registerOfflineMutations, offlineMutationKeys } = require("@/api/offline-mutations");
    const qc = new QueryClient();
    registerOfflineMutations(qc);

    const defaults = qc.getMutationDefaults(offlineMutationKeys.logFood);
    await defaults.onSuccess?.({}, { payload: { day: "2026-08-22" } }, undefined, {} as never);

    expect(mockTrack).toHaveBeenCalledWith("thrivo.food_logged", { source: "catalog" });
  });

  it("emits thrivo.food_logged for an AI estimate log", async () => {
    const { registerOfflineMutations, offlineMutationKeys } = require("@/api/offline-mutations");
    const qc = new QueryClient();
    registerOfflineMutations(qc);

    const defaults = qc.getMutationDefaults(offlineMutationKeys.logEstimate);
    await defaults.onSuccess?.({}, { payload: { day: "2026-08-22" } }, undefined, {} as never);

    expect(mockTrack).toHaveBeenCalledWith("thrivo.food_logged", { source: "estimate" });
  });

  it("emits thrivo.upgrade_prompt_shown when a premium gate renders", () => {
    const { PremiumGate } = require("@/components/PremiumGate");
    render(
      <PremiumGate title="Subscribe to see your macros" subtitle="Unlock" onViewPlans={() => {}}>
        {null}
      </PremiumGate>
    );

    expect(mockTrack).toHaveBeenCalledWith(
      "thrivo.upgrade_prompt_shown",
      expect.objectContaining({ title: "Subscribe to see your macros" })
    );
  });
});
