import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { AddWeightPayload, LogEstimatePayload, LogFoodPayload, Water } from "@/contracts";
import { newIdempotencyKey } from "@/lib/idempotency";
import { addWater, logEstimate, logFood } from "@/features/food-logging/api/food-logging.api";
import { addWeight } from "@/features/progress/api/progress.api";
import {
  invalidateFoodLogViews,
  invalidateWaterViews,
  invalidateWeightViews,
} from "./invalidation";
import { applyWaterOptimistic } from "./offline-optimistic";
import { queryKeys } from "./query-keys";

/**
 * Offline-first writes. Each carries an idempotency key minted once at enqueue
 * time so a persisted mutation that replays after an app restart / reconnect
 * lands exactly one row server-side. Defaults are registered by key so a paused,
 * persisted mutation can be re-run without the originating component mounted.
 */
export interface LogFoodVars {
  payload: LogFoodPayload;
  idempotencyKey: string;
}
export interface LogEstimateVars {
  payload: LogEstimatePayload;
  idempotencyKey: string;
}
export interface AddWaterVars {
  amountMl: number;
  day: string;
  idempotencyKey: string;
}
export interface AddWeightVars {
  payload: AddWeightPayload;
  day: string;
  idempotencyKey: string;
}

export const offlineMutationKeys = {
  logFood: ["food", "log"] as const,
  logEstimate: ["food", "logEstimate"] as const,
  addWater: ["water", "add"] as const,
  addWeight: ["weight", "add"] as const,
};

const OFFLINE_RETRY = 3;

interface WaterSnapshot {
  day: string;
  previous: Water | undefined;
}

async function optimisticAddWater(qc: QueryClient, vars: AddWaterVars): Promise<WaterSnapshot> {
  const key = queryKeys.metrics.waterByDay(vars.day);
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<Water>(key);

  if (previous) {
    qc.setQueryData<Water>(key, applyWaterOptimistic(previous, vars.amountMl, vars.idempotencyKey));
  }

  return { day: vars.day, previous };
}

/**
 * Register resumable defaults for the offline-able writes. Call once at startup,
 * before `resumePausedMutations`, so persisted offline writes have a mutationFn
 * to re-run against.
 */
export function registerOfflineMutations(qc: QueryClient): void {
  qc.setMutationDefaults(offlineMutationKeys.logFood, {
    mutationFn: (vars: LogFoodVars) => logFood(vars.payload, vars.idempotencyKey),
    onSuccess: (_data, vars: LogFoodVars) => invalidateFoodLogViews(qc, vars.payload.day),
    retry: OFFLINE_RETRY,
  });

  qc.setMutationDefaults(offlineMutationKeys.logEstimate, {
    mutationFn: (vars: LogEstimateVars) => logEstimate(vars.payload, vars.idempotencyKey),
    onSuccess: (_data, vars: LogEstimateVars) => invalidateFoodLogViews(qc, vars.payload.day),
    retry: OFFLINE_RETRY,
  });

  qc.setMutationDefaults(offlineMutationKeys.addWater, {
    mutationFn: (vars: AddWaterVars) => addWater(vars.amountMl, vars.day, vars.idempotencyKey),
    onMutate: (vars: AddWaterVars) => optimisticAddWater(qc, vars),
    onError: (_error, _vars, context) => {
      const snapshot = context as WaterSnapshot | undefined;
      if (snapshot?.previous) {
        qc.setQueryData(queryKeys.metrics.waterByDay(snapshot.day), snapshot.previous);
      }
    },
    onSettled: (_data, _error, vars: AddWaterVars) => invalidateWaterViews(qc, vars.day),
    retry: OFFLINE_RETRY,
  });

  qc.setMutationDefaults(offlineMutationKeys.addWeight, {
    mutationFn: (vars: AddWeightVars) => addWeight(vars.payload, vars.idempotencyKey),
    onSuccess: (_data, vars: AddWeightVars) => invalidateWeightViews(qc, vars.day),
    retry: OFFLINE_RETRY,
  });
}

/**
 * Thin hook over a registered offline write: callers pass the natural payload,
 * the key is minted here (once per call, reused on retry/replay), and the
 * registered default supplies the mutationFn + optimistic/invalidation behaviour.
 */
export function useOfflineWrite<TPayload, TVars>(
  mutationKey: readonly unknown[],
  buildVars: (payload: TPayload, idempotencyKey: string) => TVars
) {
  const mutation = useMutation<unknown, Error, TVars>({ mutationKey: [...mutationKey] });
  return {
    ...mutation,
    mutate: (payload: TPayload, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate(buildVars(payload, newIdempotencyKey()), options),
    mutateAsync: (payload: TPayload, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
      mutation.mutateAsync(buildVars(payload, newIdempotencyKey()), options),
  };
}
