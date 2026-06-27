import { z } from "zod";
import { idSchema, isoDateSchema, localDaySchema } from "./common";

export const foodSourceSchema = z.enum(["barcode", "manual", "search"]);
export type FoodSource = z.infer<typeof foodSourceSchema>;

export const portionMeasureSchema = z.enum(["serving", "weight", "cup", "tbsp", "piece"]);
export type PortionMeasure = z.infer<typeof portionMeasureSchema>;

export const nutrientsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type Nutrients = z.infer<typeof nutrientsSchema>;

export const servingOptionSchema = z.object({
  id: idSchema.nullable(),
  measure: portionMeasureSchema,
  label: z.string(),
  grams: z.number().nullable(),
  isDefault: z.boolean(),
});
export type ServingOption = z.infer<typeof servingOptionSchema>;

export const foodItemSchema = z.object({
  id: idSchema,
  name: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  source: z.enum(["authoritative", "personal", "community"]),
  servingLabel: z.string(),
  servingGrams: z.number().nullable(),
  nutrients: nutrientsSchema,
  servingOptions: z.array(servingOptionSchema),
  isPersonal: z.boolean(),
  isEstimated: z.boolean(),
});
export type FoodItem = z.infer<typeof foodItemSchema>;

export const foodLogEntrySchema = z.object({
  id: idSchema,
  foodItemId: idSchema.nullable(),
  name: z.string(),
  day: localDaySchema,
  servings: z.number().positive(),
  servingUnit: z.string().nullable(),
  source: foodSourceSchema,
  barcode: z.string().nullable(),
  isEstimated: z.boolean(),
  nutrients: nutrientsSchema,
  consumedAt: isoDateSchema,
  loggedAt: isoDateSchema,
});
export type FoodLogEntry = z.infer<typeof foodLogEntrySchema>;

export const dailyTotalsSchema = z.object({
  day: localDaySchema,
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type DailyTotals = z.infer<typeof dailyTotalsSchema>;

export const foodLookupResponse = z.object({ food: foodItemSchema.nullable() });
export type FoodLookupResponse = z.infer<typeof foodLookupResponse>;

export const foodSearchResponse = z.object({ items: z.array(foodItemSchema) });
export type FoodSearchResponse = z.infer<typeof foodSearchResponse>;

export const upsertFoodPayload = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  servingLabel: z.string().min(1),
  servingGrams: z.number().positive().optional(),
  nutrients: nutrientsSchema,
});
export type UpsertFoodPayload = z.infer<typeof upsertFoodPayload>;

export const foodItemResponse = z.object({ food: foodItemSchema });
export type FoodItemResponse = z.infer<typeof foodItemResponse>;

export const logFoodPayload = z.object({
  foodItemId: idSchema,
  day: localDaySchema,
  servings: z.number().positive(),
  servingId: idSchema.optional(),
  servingUnit: z.string().optional(),
  consumedAt: isoDateSchema.optional(),
});
export type LogFoodPayload = z.infer<typeof logFoodPayload>;

export const updateLogPayload = z.object({
  servings: z.number().positive().optional(),
  servingId: idSchema.nullable().optional(),
  servingUnit: z.string().nullable().optional(),
  consumedAt: isoDateSchema.optional(),
});
export type UpdateLogPayload = z.infer<typeof updateLogPayload>;

export const logMutationResponse = z.object({
  entry: foodLogEntrySchema,
  totals: dailyTotalsSchema,
});
export type LogMutationResponse = z.infer<typeof logMutationResponse>;

export const foodLogDayResponse = z.object({
  day: localDaySchema,
  entries: z.array(foodLogEntrySchema),
  isEmptyDay: z.boolean(),
});
export type FoodLogDayResponse = z.infer<typeof foodLogDayResponse>;

export const historyDaySchema = z.object({
  day: localDaySchema,
  isLocked: z.boolean(),
  lockReason: z.enum(["free_history_limit"]).nullable(),
  entries: z.array(foodLogEntrySchema),
});
export type HistoryDay = z.infer<typeof historyDaySchema>;

export const foodLogHistoryResponse = z.object({
  days: z.array(historyDaySchema),
  historyLimitDays: z.number(),
});
export type FoodLogHistoryResponse = z.infer<typeof foodLogHistoryResponse>;

export const recentFoodsResponse = z.object({ items: z.array(foodLogEntrySchema) });
export type RecentFoodsResponse = z.infer<typeof recentFoodsResponse>;

export const favoritesResponse = z.object({ items: z.array(foodItemSchema) });
export type FavoritesResponse = z.infer<typeof favoritesResponse>;

export const addFavoritePayload = z.object({ foodItemId: idSchema });
export type AddFavoritePayload = z.infer<typeof addFavoritePayload>;

export const estimateFoodPayload = z.object({
  name: z.string().min(1),
  ingredients: z.string().optional(),
  cookingMethod: z.string().optional(),
  portionMeasure: portionMeasureSchema,
  quantity: z.number().positive(),
  consumedAt: isoDateSchema.optional(),
});
export type EstimateFoodPayload = z.infer<typeof estimateFoodPayload>;

export const estimateFoodResponse = z.object({
  estimate: z.object({
    name: z.string(),
    servingUnit: z.string(),
    quantity: z.number().positive(),
    nutrients: nutrientsSchema,
    isEstimated: z.literal(true),
  }),
});
export type EstimateFoodResponse = z.infer<typeof estimateFoodResponse>;

export const logEstimatePayload = estimateFoodPayload.extend({
  day: localDaySchema,
  nutrients: nutrientsSchema,
  servingUnit: z.string().optional(),
});
export type LogEstimatePayload = z.infer<typeof logEstimatePayload>;
