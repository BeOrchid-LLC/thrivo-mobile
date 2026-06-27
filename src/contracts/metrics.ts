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
