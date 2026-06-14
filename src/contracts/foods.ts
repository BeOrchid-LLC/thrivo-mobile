import { z } from "zod";
import { idSchema, isoDateSchema, localDaySchema } from "./common";

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof mealTypeSchema>;

/** Per-serving nutrient facts. */
export const nutrientsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type Nutrients = z.infer<typeof nutrientsSchema>;

export const foodItemSchema = z.object({
  id: idSchema,
  name: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  servingLabel: z.string(),
  servingGrams: z.number().nullable(),
  nutrients: nutrientsSchema,
  /** True when the item is the user's own personal/custom food. */
  isPersonal: z.boolean(),
});
export type FoodItem = z.infer<typeof foodItemSchema>;

export const foodLogEntrySchema = z.object({
  id: idSchema,
  foodItemId: idSchema,
  name: z.string(),
  meal: mealTypeSchema,
  day: localDaySchema,
  servings: z.number().positive(),
  /** Nutrients snapshotted at log time (immune to later item edits). */
  nutrients: nutrientsSchema,
  loggedAt: isoDateSchema,
});
export type FoodLogEntry = z.infer<typeof foodLogEntrySchema>;

/** Running daily totals returned alongside a log mutation (one round-trip). */
export const dailyTotalsSchema = z.object({
  day: localDaySchema,
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type DailyTotals = z.infer<typeof dailyTotalsSchema>;

// --- Payloads & responses ---

export const foodLookupResponse = z.object({ food: foodItemSchema.nullable() });
export type FoodLookupResponse = z.infer<typeof foodLookupResponse>;

export const foodSearchResponse = z.object({ items: z.array(foodItemSchema) });
export type FoodSearchResponse = z.infer<typeof foodSearchResponse>;

export const upsertFoodPayload = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  servingLabel: z.string().min(1),
  servingGrams: z.number().positive().optional(),
  nutrients: nutrientsSchema,
});
export type UpsertFoodPayload = z.infer<typeof upsertFoodPayload>;

export const foodItemResponse = z.object({ food: foodItemSchema });
export type FoodItemResponse = z.infer<typeof foodItemResponse>;

export const logFoodPayload = z.object({
  foodItemId: idSchema,
  meal: mealTypeSchema,
  day: localDaySchema,
  servings: z.number().positive(),
});
export type LogFoodPayload = z.infer<typeof logFoodPayload>;

export const updateLogPayload = z.object({
  meal: mealTypeSchema.optional(),
  servings: z.number().positive().optional(),
});
export type UpdateLogPayload = z.infer<typeof updateLogPayload>;

/** Log create/update returns the entry plus the recomputed daily totals. */
export const logMutationResponse = z.object({
  entry: foodLogEntrySchema,
  totals: dailyTotalsSchema,
});
export type LogMutationResponse = z.infer<typeof logMutationResponse>;

export const logHistoryResponse = z.object({ entries: z.array(foodLogEntrySchema) });
export type LogHistoryResponse = z.infer<typeof logHistoryResponse>;

export const favoritesResponse = z.object({ items: z.array(foodItemSchema) });
export type FavoritesResponse = z.infer<typeof favoritesResponse>;

export const addFavoritePayload = z.object({ foodItemId: idSchema });
export type AddFavoritePayload = z.infer<typeof addFavoritePayload>;
