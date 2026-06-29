import { applyWaterOptimistic } from "../offline-optimistic";
import type { Water } from "@/contracts";

const base: Water = {
  day: "2026-06-28",
  totalMl: 500,
  targetMl: 2000,
  remainingMl: 1500,
  progressPercent: 25,
  glassMl: 250,
  glasses: 2,
  targetGlasses: 8,
  entries: [],
  alert: null,
};

describe("applyWaterOptimistic", () => {
  it("adds the amount to the day total and recomputes derived fields", () => {
    const next = applyWaterOptimistic(base, 250, "key-1");
    expect(next.totalMl).toBe(750);
    expect(next.remainingMl).toBe(1250);
    expect(next.progressPercent).toBe(38); // round(750 / 2000 * 100)
    expect(next.glasses).toBe(3);
  });

  it("prepends an optimistic entry tagged with the idempotency key", () => {
    const next = applyWaterOptimistic(base, 250, "key-1");
    expect(next.entries[0]).toMatchObject({ id: "optimistic-key-1", amountMl: 250, day: base.day });
  });

  it("clamps remaining at zero and percent at 100 when over target", () => {
    const next = applyWaterOptimistic({ ...base, totalMl: 1900 }, 500, "k");
    expect(next.remainingMl).toBe(0);
    expect(next.progressPercent).toBe(100);
  });

  it("does not mutate the previous state", () => {
    const snapshot = structuredClone(base);
    applyWaterOptimistic(base, 250, "k");
    expect(base).toEqual(snapshot);
  });
});
