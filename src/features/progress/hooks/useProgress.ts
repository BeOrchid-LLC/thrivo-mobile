import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateWeightViews, queryKeys } from "@/api";
import { localDay } from "@/utils";
import type { AddWeightPayload, ChartMetric, ChartPeriod } from "@/contracts";
import {
  addWeight,
  deleteWeight,
  getMetricChart,
  getProgress,
  getWeightContext,
} from "../api/progress.api";

export function useProgress(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.progress(day),
    queryFn: () => getProgress(day),
    staleTime: 1000 * 60,
  });
}

export function useMetricChart(metric: ChartMetric, period: ChartPeriod, day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.chart(metric, period, day),
    queryFn: () => getMetricChart(metric, period, day),
    staleTime: 1000 * 60,
  });
}

export function useWeightContext(day = localDay()) {
  return useQuery({
    queryKey: queryKeys.metrics.weightContext(day),
    queryFn: () => getWeightContext(day),
    staleTime: 1000 * 60,
  });
}

export function useAddWeight(day = localDay()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddWeightPayload) => addWeight(payload),
    onSuccess: () => invalidateProgressQueries(queryClient, day),
  });
}

export function useDeleteWeight(day = localDay()) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWeight(id),
    onSuccess: () => invalidateProgressQueries(queryClient, day),
  });
}

function invalidateProgressQueries(queryClient: ReturnType<typeof useQueryClient>, day: string) {
  invalidateWeightViews(queryClient, day);
}
