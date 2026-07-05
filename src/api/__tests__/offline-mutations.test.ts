import { QueryClient } from "@tanstack/react-query";
import { setTokenGetter } from "../auth-token";
import { offlineMutationKeys, registerOfflineMutations } from "../offline-mutations";
import { queryKeys } from "../query-keys";

describe("addWater optimistic update", () => {
  beforeEach(() => {
    setTokenGetter(() => "test-token");
  });

  it("skips the optimistic bump instead of throwing when the cache holds an incompatible shape", async () => {
    const qc = new QueryClient({
      defaultOptions: { mutations: { retry: false, networkMode: "offlineFirst" } },
    });
    registerOfflineMutations(qc);

    const day = "2026-07-05";
    // Simulates a cache entry written under an older/incompatible shape (e.g. a
    // persisted cache restored after a contract change) — no top-level `entries`.
    qc.setQueryData(queryKeys.metrics.waterByDay(day), {
      water: { day, totalMl: 250, targetMl: 2000, entries: [] },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          responseCode: 200,
          message: "ok",
          data: {
            water: {
              day,
              totalMl: 500,
              targetMl: 2000,
              remainingMl: 1500,
              progressPercent: 25,
              glassMl: 250,
              glasses: 2,
              targetGlasses: 8,
              entries: [{ id: "e1", amountMl: 250, day, recordedAt: new Date().toISOString() }],
              alert: null,
            },
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const mutation = qc
      .getMutationCache()
      .build(qc, { mutationKey: [...offlineMutationKeys.addWater] });

    // Before the fix, `onMutate` threw synchronously on the malformed cache
    // entry ("undefined is not iterable"), so the mutationFn (network call)
    // was never even reached. Resolving here proves that no longer happens.
    await expect(
      mutation.execute({ amountMl: 250, day, idempotencyKey: "key-1" })
    ).resolves.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
