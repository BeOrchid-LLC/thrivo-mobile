import { z } from "zod";
import { idSchema, isoDateSchema, localDaySchema } from "./common";

export const weightEntrySchema = z.object({
  id: idSchema,
  weightKg: z.number().positive(),
  day: localDaySchema,
  recordedAt: isoDateSchema,
});
export type WeightEntry = z.infer<typeof weightEntrySchema>;

export const weightListResponse = z.object({ entries: z.array(weightEntrySchema) });
export type WeightListResponse = z.infer<typeof weightListResponse>;

export const addWeightPayload = z.object({
  weightKg: z.number().positive(),
  day: localDaySchema,
});
export type AddWeightPayload = z.infer<typeof addWeightPayload>;

export const weightEntryResponse = z.object({ entry: weightEntrySchema });
export type WeightEntryResponse = z.infer<typeof weightEntryResponse>;

export const waterEntrySchema = z.object({
  id: idSchema,
  amountMl: z.number().int().positive(),
  day: localDaySchema,
  recordedAt: isoDateSchema,
});
export type WaterEntry = z.infer<typeof waterEntrySchema>;

export const hydrationAlertSchema = z.object({
  title: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning"]),
});
export type HydrationAlert = z.infer<typeof hydrationAlertSchema>;

export const waterSchema = z.object({
  day: localDaySchema,
  totalMl: z.number(),
  targetMl: z.number(),
  remainingMl: z.number(),
  progressPercent: z.number(),
  glassMl: z.number(),
  glasses: z.number(),
  targetGlasses: z.number(),
  entries: z.array(waterEntrySchema),
  alert: hydrationAlertSchema.nullable(),
});
export type Water = z.infer<typeof waterSchema>;

export const waterResponse = z.object({ water: waterSchema });
export type WaterResponse = z.infer<typeof waterResponse>;

export const addWaterPayload = z.object({
  day: localDaySchema,
  amountMl: z.number().int().positive(),
});
export type AddWaterPayload = z.infer<typeof addWaterPayload>;

export const chartMetric = z.enum(["calories", "water", "weight"]);
export type ChartMetric = z.infer<typeof chartMetric>;

export const chartPeriod = z.enum(["7d", "14d", "1m", "1q", "6m", "1y", "all"]);
export type ChartPeriod = z.infer<typeof chartPeriod>;

export const progressSummarySchema = z.object({
  currentWeightKg: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  goalGapKg: z.number().nullable(),
  currentStreakDays: z.number().int(),
  longestStreakDays: z.number().int(),
  currentWeekAverageKcal: z.number().int(),
});
export type ProgressSummary = z.infer<typeof progressSummarySchema>;

export const goalProjectionSchema = z.object({
  projectedDate: localDaySchema.nullable(),
  projectedMonth: z.string().nullable(),
  weeklyRateKg: z.number().nullable(),
  status: z.enum(["on_track", "off_track", "maintaining", "not_enough_data"]),
});
export type GoalProjection = z.infer<typeof goalProjectionSchema>;

export const calendarDaySchema = z.object({
  day: localDaySchema,
  dayOfMonth: z.number().int(),
  logged: z.boolean(),
  today: z.boolean(),
  inMonth: z.boolean(),
});
export type CalendarDay = z.infer<typeof calendarDaySchema>;

export const progressResponse = z.object({
  progress: z.object({
    day: localDaySchema,
    summary: progressSummarySchema,
    projection: goalProjectionSchema,
    calendar: z.object({
      month: z.string(),
      days: z.array(calendarDaySchema),
    }),
  }),
});
export type ProgressResponse = z.infer<typeof progressResponse>;

export const chartPointSchema = z.object({
  date: localDaySchema,
  value: z.number().nullable(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const chartResponse = z.object({
  chart: z.object({
    metric: chartMetric,
    period: chartPeriod,
    unit: z.enum(["kcal", "ml", "kg"]),
    from: localDaySchema,
    to: localDaySchema,
    points: z.array(chartPointSchema),
  }),
});
export type ChartResponse = z.infer<typeof chartResponse>;

export const weightContextResponse = z.object({
  context: z.object({
    day: localDaySchema,
    currentWeightKg: z.number().nullable(),
    yesterdayWeightKg: z.number().nullable(),
    sevenDayAverageKg: z.number().nullable(),
    targetWeightKg: z.number().nullable(),
    projection: goalProjectionSchema,
  }),
});
export type WeightContextResponse = z.infer<typeof weightContextResponse>;
