import { createElement, type ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/api/query-keys";
import type { UserSettings } from "@/contracts";
import { useUpdateSettings } from "../hooks/useUpdateSettings";

const mockUpdate = jest.fn();
jest.mock("../api/settings.api", () => ({
  updateSettings: (payload: unknown) => mockUpdate(payload),
}));

// Only the fields the optimistic patch reads matter here; cast through unknown.
const baseSettings = {
  unitSystem: "metric",
  dailyFoodLogReminderEnabled: true,
  dailyFoodLogReminderTime: "08:00",
  weightCheckReminderEnabled: false,
  weightCheckReminderTime: "09:00",
  weightCheckReminderWeekday: "friday",
  hydrationReminderEnabled: true,
  hydrationReminderIntervalMinutes: 40,
} as unknown as UserSettings;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(queryKeys.settings.me(), baseSettings);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useUpdateSettings(), { wrapper });
  return { queryClient, result };
}

describe("useUpdateSettings (optimistic)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("flips the cached value immediately, before the request resolves", async () => {
    let resolve!: (s: UserSettings) => void;
    mockUpdate.mockReturnValue(new Promise<UserSettings>((r) => (resolve = r)));
    const { queryClient, result } = setup();

    act(() => result.current.mutate({ dailyFoodLogReminderEnabled: false }));

    // Optimistic patch is visible synchronously, while the mutation is in flight.
    await waitFor(() =>
      expect(
        queryClient.getQueryData<UserSettings>(queryKeys.settings.me())?.dailyFoodLogReminderEnabled
      ).toBe(false)
    );

    act(() => resolve({ ...baseSettings, dailyFoodLogReminderEnabled: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back to the prior snapshot on error", async () => {
    mockUpdate.mockRejectedValue(new Error("network"));
    const { queryClient, result } = setup();

    act(() => result.current.mutate({ dailyFoodLogReminderEnabled: false }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<UserSettings>(queryKeys.settings.me())?.dailyFoodLogReminderEnabled
    ).toBe(true);
  });
});
