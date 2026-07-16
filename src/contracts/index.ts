/**
 * Contract seam for the mobile app.
 *
 * The single source of truth is the published `@beorchid-llc/thrivo-contracts`
 * package (it mirrors the backend). This barrel re-exports that package under the
 * names the app's call sites already use: the package suffixes every schema with
 * `Schema`, exposes enum *types* only as schemas, and models responses as the full
 * `{ success, data, … }` envelope — whereas the app predates those conventions and
 * its `callApi` validates the unwrapped `data`. The aliases below bridge the gap
 * (`.shape.data` unwraps an envelope) without touching ~47 importers.
 *
 * Add or change contracts in the package, never here. This file only renames.
 */
import { z } from "zod";
import * as pkg from "@beorchid-llc/thrivo-contracts";

// Everything whose name already matches (idSchema, goalSchema, foodItemSchema,
// userSettingsSchema, ackSchema, emailSchema, authSessionSchema, …) passes through.
export * from "@beorchid-llc/thrivo-contracts";

// ---- payload / enum value aliases (local name → package `*Schema`) ----
export const addFavoritePayload = pkg.addFavoritePayloadSchema;
export const addWaterPayload = pkg.addWaterPayloadSchema;
export const addWeightPayload = pkg.addWeightPayloadSchema;
export const cancelSubscriptionPayload = pkg.cancelSubscriptionPayloadSchema;
export const chartMetric = pkg.chartMetricSchema;
export const chartPeriod = pkg.chartPeriodSchema;
export const estimateFoodPayload = pkg.estimateFoodPayloadSchema;
export const logEstimatePayload = pkg.logEstimatePayloadSchema;
export const otpRequestPayload = pkg.otpRequestPayloadSchema;
export const otpVerifyPayload = pkg.otpVerifyPayloadSchema;
export const purchaseSubscriptionPayload = pkg.purchaseSubscriptionPayloadSchema;
export const requestUploadPayload = pkg.requestUploadPayloadSchema;
export const startTrialPayload = pkg.startTrialPayloadSchema;
export const subscriptionSchema = pkg.subscriptionStateSchema;
export const subscriptionStatusSchema = pkg.publicSubscriptionStatusSchema;
export const updateLogPayload = pkg.updateLogPayloadSchema;
export const updateProfilePayload = pkg.updateProfilePayloadSchema;
export const updateUserSettingsPayload = pkg.updateUserSettingsPayloadSchema;
export const updateWaterPayload = pkg.updateWaterPayloadSchema;
export const upsertFoodPayload = pkg.upsertFoodPayloadSchema;
export const userSchema = pkg.userProfileSchema;
export type UpdateProfilePayload = z.infer<typeof updateProfilePayload>;
export const errorEnvelope = pkg.apiErrorSchema;

// `*ResultSchema` are already the inner data shape — alias directly.
export const requestUploadResult = pkg.requestUploadResultSchema;
export const verifyUploadResult = pkg.verifyUploadResultSchema;

const foodItemWithFavoriteSchema = pkg.foodItemSchema.extend({
  isFavorite: z.boolean().optional(),
});
const foodLogEntryWithFavoriteSchema = pkg.foodLogEntrySchema.extend({
  isFavorite: z.boolean().optional(),
});
const historyDayWithFavoritesSchema = z.object({
  day: pkg.localDaySchema,
  isLocked: z.boolean().default(false),
  lockReason: z.enum(["free_history_limit"]).nullable().default(null),
  entries: z.array(foodLogEntryWithFavoriteSchema),
});
export const foodLogHistoryLockedRangeSchema = z.object({
  from: pkg.localDaySchema,
  to: pkg.localDaySchema,
  lockReason: z.enum(["free_history_limit"]),
});

// `*ResponseSchema` are full `{ success, data, … }` envelopes; `callApi` validates
// the unwrapped `data`, so expose `.shape.data` under the app's response names.
export const chartResponse = pkg.chartResponseSchema.shape.data;
export const dashboardCaloriesResponse = pkg.dashboardCaloriesResponseSchema.shape.data;
export const dashboardMacrosResponse = pkg.dashboardMacrosResponseSchema.shape.data;
export const dashboardStreakResponse = pkg.dashboardStreakResponseSchema.shape.data;
export const estimateFoodResponse = pkg.estimateFoodResponseSchema.shape.data;
// R5-1: list and mutation responses diverged — add/remove now return the
// single changed item (nullable on remove), not a full re-list.
export const favoritesListResponse = z.object({ items: z.array(foodItemWithFavoriteSchema) });
export const favoriteMutationResponse = z.object({ item: foodItemWithFavoriteSchema.nullable() });
export const foodItemResponse = z.object({ food: foodItemWithFavoriteSchema });
export const foodLogDayResponse = pkg.foodLogDayResponseSchema.shape.data.extend({
  entries: z.array(foodLogEntryWithFavoriteSchema),
});
export const foodLogHistoryResponse = z.object({
  period: pkg.chartPeriodSchema,
  date: pkg.localDaySchema,
  from: pkg.localDaySchema,
  to: pkg.localDaySchema,
  days: z.array(historyDayWithFavoritesSchema),
  lockedRange: foodLogHistoryLockedRangeSchema.nullable(),
  historyLimitDays: z.number().int(),
});
export const foodLookupResponse = pkg.foodLookupResponseSchema.shape.data;
export const logMutationResponse = pkg.logMutationResponseSchema.shape.data.extend({
  entry: foodLogEntryWithFavoriteSchema,
});
export const meResponse = pkg.getMeResponseSchema.shape.data;
export const progressResponse = pkg.progressResponseSchema.shape.data;
export const recentFoodsResponse = z.object({ items: z.array(foodLogEntryWithFavoriteSchema) });
export const subscriptionResponse = pkg.subscriptionResponseSchema.shape.data;
export const waterResponse = pkg.waterResponseSchema.shape.data;
export const waterHistoryResponse = z.object({
  history: z.object({
    period: pkg.chartPeriodSchema,
    date: pkg.localDaySchema,
    from: pkg.localDaySchema,
    to: pkg.localDaySchema,
    days: z.array(
      z.object({
        day: pkg.localDaySchema,
        totalMl: z.number().int().nonnegative(),
        entries: z.array(pkg.waterEntrySchema),
      })
    ),
    lockedRange: z
      .object({
        from: pkg.localDaySchema,
        to: pkg.localDaySchema,
        lockReason: z.enum(["free_history_limit"]),
      })
      .nullable(),
    historyLimitDays: z.number().int(),
  }),
});
export const weightContextResponse = pkg.weightContextResponseSchema.shape.data;
export const weightEntryResponse = pkg.weightEntryResponseSchema.shape.data;

// ---- type aliases (package exposes most enum/response types only as schemas) ----
export type AccountStatus = z.infer<typeof pkg.accountStatusSchema>;
export type ActivationIntent = z.infer<typeof pkg.activationIntentSchema>;
export type ActivityLevel = z.infer<typeof pkg.activityLevelSchema>;
export type AddFavoritePayload = z.infer<typeof pkg.addFavoritePayloadSchema>;
export type CalendarDay = z.infer<typeof pkg.calendarDaySchema>;
export type ChartMetric = z.infer<typeof chartMetric>;
export type ChartPoint = z.infer<typeof pkg.chartPointSchema>;
export type Goal = z.infer<typeof pkg.goalSchema>;
export type ProgressSummary = z.infer<typeof pkg.progressSummarySchema>;
export type Sex = z.infer<typeof pkg.sexSchema>;
export type Subscription = pkg.SubscriptionState;
export type SubscriptionStatus = pkg.PublicSubscriptionStatus;
export type UpdateWaterPayload = z.infer<typeof pkg.updateWaterPayloadSchema>;
export type User = pkg.UserProfile;
export type ErrorEnvelope = pkg.ApiError;

// Response types mirror the unwrapped `data` (see value aliases above).
export type ChartResponse = z.infer<typeof chartResponse>;
export type DashboardCaloriesResponse = z.infer<
  typeof pkg.dashboardCaloriesResponseSchema.shape.data
>;
export type DashboardMacrosResponse = z.infer<typeof pkg.dashboardMacrosResponseSchema.shape.data>;
export type DashboardStreakResponse = z.infer<typeof pkg.dashboardStreakResponseSchema.shape.data>;
export type EstimateFoodResponse = z.infer<typeof pkg.estimateFoodResponseSchema.shape.data>;
export type FavoritesListResponse = z.infer<typeof favoritesListResponse>;
export type FavoriteMutationResponse = z.infer<typeof favoriteMutationResponse>;
export type FoodItem = z.infer<typeof foodItemWithFavoriteSchema>;
export type FoodLogEntry = z.infer<typeof foodLogEntryWithFavoriteSchema>;
export type HistoryDay = z.infer<typeof historyDayWithFavoritesSchema>;
export type FoodItemResponse = z.infer<typeof foodItemResponse>;
export type FoodLogDayResponse = z.infer<typeof foodLogDayResponse>;
export type FoodLogHistoryResponse = z.infer<typeof foodLogHistoryResponse>;
export type FoodLookupResponse = z.infer<typeof pkg.foodLookupResponseSchema.shape.data>;
export type LogMutationResponse = z.infer<typeof logMutationResponse>;
export type MeResponse = z.infer<typeof pkg.getMeResponseSchema.shape.data>;
export type ProgressResponse = z.infer<typeof pkg.progressResponseSchema.shape.data>;
export type RecentFoodsResponse = z.infer<typeof recentFoodsResponse>;
// Shadow the package's envelope-typed `SubscriptionResponse` with the unwrapped shape.
export type SubscriptionResponse = z.infer<typeof pkg.subscriptionResponseSchema.shape.data>;
export type WaterResponse = z.infer<typeof pkg.waterResponseSchema.shape.data>;
export type WaterHistoryResponse = z.infer<typeof waterHistoryResponse>;
export type WeightContextResponse = z.infer<typeof pkg.weightContextResponseSchema.shape.data>;
export type WeightEntryResponse = z.infer<typeof pkg.weightEntryResponseSchema.shape.data>;

// boundedNutrientsSchema, foodSearchResultSchema, and externalFoodSnapshotSchema
// used to be hand-rolled here (patched around a stale published package) — the
// package now defines all three under these exact names, so they already flow
// through the `export *` passthrough above.

export const foodSearchResponse = pkg.foodSearchResponseSchema.shape.data;
export type FoodSearchResponse = z.infer<typeof pkg.foodSearchResponseSchema.shape.data>;

export const logFoodPayload = pkg.logFoodPayloadSchema;
export type LogFoodPayload = z.infer<typeof pkg.logFoodPayloadSchema>;
