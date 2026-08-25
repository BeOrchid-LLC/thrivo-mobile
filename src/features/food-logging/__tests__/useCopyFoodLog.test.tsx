import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { offlineMutationKeys, type LogFoodVars } from "@/api";
import type { FoodLogEntry } from "@/contracts";
import { useCopyFoodLog } from "../hooks/useFoodLogging";

const mockLogFood = jest.fn();
const mockIsNetworkReachable = jest.fn(async () => true);
const mockTrack = jest.fn();

jest.mock("@/lib", () => ({
  analytics: { track: (...args: unknown[]) => mockTrack(...args) },
  isNetworkReachable: () => mockIsNetworkReachable(),
}));

function entry(overrides: Partial<FoodLogEntry> & { id: string }): FoodLogEntry {
  return {
    foodItemId: `item-${overrides.id}`,
    servingId: null,
    name: "Oats",
    day: "2026-06-20",
    servings: 1,
    servingUnit: "bowl",
    source: "search",
    barcode: null,
    isEstimated: false,
    isFavorite: false,
    nutrients: { calories: 200, proteinG: 8, carbsG: 30, fatG: 4 },
    consumedAt: new Date(2026, 5, 20, 8, 0, 0).toISOString(),
    loggedAt: new Date(2026, 5, 20, 8, 0, 0).toISOString(),
    ...overrides,
  };
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false, networkMode: "offlineFirst" } },
  });
  // Stand in for the app's registered offline default (api/offline-mutations),
  // without its retries — this test is about the copy loop, not retry policy.
  queryClient.setMutationDefaults(offlineMutationKeys.logFood, {
    mutationFn: (vars: LogFoodVars) => mockLogFood(vars.payload, vars.idempotencyKey),
    retry: false,
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useCopyFoodLog(), { wrapper });
}

type CopyHook = ReturnType<typeof setup>["result"];

/** `copy` flips the hook's `isCopying` state, so it has to run inside `act`. */
async function copyWithin(result: CopyHook, entries: FoodLogEntry[], scope: "day" | "meal") {
  let outcome: Awaited<ReturnType<CopyHook["current"]["copy"]>> | undefined;
  await act(async () => {
    outcome = await result.current.copy(entries, "2026-06-21", scope);
  });
  return outcome;
}

describe("useCopyFoodLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNetworkReachable.mockResolvedValue(true);
    mockLogFood.mockResolvedValue({});
  });

  it("logs one entry at a time and counts what landed", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mockLogFood.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return {};
    });
    const { result } = setup();

    const outcome = await copyWithin(result, [entry({ id: "a" }), entry({ id: "b" })], "day");

    expect(outcome).toEqual({ copied: 2, failed: 0, skipped: 0, queued: 0 });
    expect(maxInFlight).toBe(1);
    expect(mockLogFood).toHaveBeenCalledTimes(2);
    expect(mockLogFood.mock.calls[0][0]).toMatchObject({ foodItemId: "item-a", day: "2026-06-21" });
    expect(mockLogFood.mock.calls[1][0]).toMatchObject({ foodItemId: "item-b", day: "2026-06-21" });
    expect(mockTrack).toHaveBeenCalledWith("thrivo.log_copied", { scope: "day", count: 2 });
  });

  it("keeps going after a failed entry and reports it", async () => {
    mockLogFood.mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce({});
    const { result } = setup();

    const outcome = await copyWithin(result, [entry({ id: "a" }), entry({ id: "b" })], "day");

    expect(outcome).toEqual({ copied: 1, failed: 1, skipped: 0, queued: 0 });
    expect(mockTrack).toHaveBeenCalledWith("thrivo.log_copied", { scope: "day", count: 1 });
  });

  it("queues the writes instead of awaiting them when offline", async () => {
    mockIsNetworkReachable.mockResolvedValue(false);
    const { result } = setup();

    const outcome = await copyWithin(result, [entry({ id: "a" })], "meal");

    expect(outcome).toEqual({ copied: 0, failed: 0, skipped: 0, queued: 1 });
    // Nothing is claimed as copied, so no copy event is emitted either.
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("sends nothing when every entry is an uncopyable estimate", async () => {
    const { result } = setup();

    const outcome = await copyWithin(
      result,
      [entry({ id: "a", foodItemId: null, isEstimated: true })],
      "day"
    );

    expect(outcome).toEqual({ copied: 0, failed: 0, skipped: 1, queued: 0 });
    expect(mockLogFood).not.toHaveBeenCalled();
  });
});
