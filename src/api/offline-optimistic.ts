import type { Water } from "@/contracts";

/**
 * Fold an optimistic water entry into the cached day state — pure, so the
 * offline write reflects instantly with no network and is unit-testable without
 * a QueryClient. Returns a new object; never mutates `previous`.
 */
export function applyWaterOptimistic(
  previous: Water,
  amountMl: number,
  idempotencyKey: string
): Water {
  const totalMl = previous.totalMl + amountMl;
  return {
    ...previous,
    totalMl,
    remainingMl: Math.max(previous.targetMl - totalMl, 0),
    progressPercent:
      previous.targetMl > 0 ? Math.min(Math.round((totalMl / previous.targetMl) * 100), 100) : 0,
    glasses: Math.floor(totalMl / previous.glassMl),
    entries: [
      {
        id: `optimistic-${idempotencyKey}`,
        amountMl,
        day: previous.day,
        recordedAt: new Date().toISOString(),
      },
      ...previous.entries,
    ],
  };
}
