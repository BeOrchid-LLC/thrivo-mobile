import { callApi } from "@/api";
import { localDay } from "@/utils";
import type { AddWeightPayload, ChartMetric, ChartPeriod } from "@/contracts";

export const getProgress = (day = localDay()) => callApi("PROGRESS_GET", { query: { date: day } });

export const getMetricChart = (metric: ChartMetric, period: ChartPeriod, day = localDay()) =>
  callApi("METRICS_CHART", { query: { metric, period, date: day } });

export const getWeightContext = (day = localDay()) =>
  callApi("WEIGHT_CONTEXT", { query: { date: day } });

export const addWeight = (payload: AddWeightPayload, idempotencyKey?: string) =>
  callApi("WEIGHT_ADD", { payload, idempotencyKey });

export const deleteWeight = (id: string) => callApi("WEIGHT_DELETE", { params: { id } });
