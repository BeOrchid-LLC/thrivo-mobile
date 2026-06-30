import { z } from "zod";
import { idSchema, isoDateSchema } from "./common";

export const goalSchema = z.enum(["lose", "maintain", "gain"]);
export type Goal = z.infer<typeof goalSchema>;

export const sexSchema = z.enum(["male", "female", "prefer_not_to_say"]);
export type Sex = z.infer<typeof sexSchema>;

export const unitSystemSchema = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof unitSystemSchema>;

export const activityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

export const accountStatusSchema = z.enum(["dormant", "free_trial", "free_plan", "paid"]);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const activationIntentSchema = z.enum(["skip", "start_free_trial", "complete"]);
export type ActivationIntent = z.infer<typeof activationIntentSchema>;

/** Server-computed nutrition targets (TDEE truth lives on the backend). */
export const targetsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type Targets = z.infer<typeof targetsSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  name: z.string(),
  image: z.string().url().nullable(),
  goal: goalSchema.nullable(),
  sex: sexSchema.nullable(),
  age: z.number().int().nullable(),
  heightCm: z.string().nullable(),
  weightKg: z.string().nullable(),
  targetWeightKg: z.string().nullable(),
  tdeeKcal: z.number().int().nullable(),
  dailyTargetKcal: z.number().int().nullable(),
  targetProteinG: z.number().int().nullable(),
  targetCarbsG: z.number().int().nullable(),
  targetFatG: z.number().int().nullable(),
  activityLevel: activityLevelSchema.nullable(),
  manualDailyTargetKcal: z.number().int().nullable(),
  notifyTimes: z.array(z.string()).nullable(),
  timezone: z.string().nullable(),
  tier: z.enum(["free", "premium"]),
  accountStatus: accountStatusSchema,
  trialEndsAt: isoDateSchema.nullable(),
  onboardingStep: z.number().int(),
  isOnboarded: z.boolean(),
  isOnboardingSkipped: z.boolean(),
  createdAt: isoDateSchema,
});
export type User = z.infer<typeof userSchema>;

/** Onboarding profile submission; server recomputes TDEE/targets. */
export const updateProfilePayload = z.object({
  firstName: z.string().min(1).optional(),
  /** Avatar URL — a verified R2 public URL, or null to clear. Sendable on its own. */
  image: z.string().url().nullable().optional(),
  goal: goalSchema.optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  ageYears: z.number().int().min(13).optional(),
  sex: sexSchema.optional(),
  activityLevel: activityLevelSchema.optional(),
  unitSystem: unitSystemSchema.optional(),
  manualDailyTargetKcal: z.number().int().positive().optional(),
  notifyTimes: z.array(z.string()).max(3).optional(),
  timezone: z.string().optional(),
  onboardingStep: z.number().int().optional(),
  activationIntent: activationIntentSchema.optional(),
});
export type UpdateProfilePayload = z.infer<typeof updateProfilePayload>;

export const meResponse = userSchema;
export type MeResponse = z.infer<typeof meResponse>;
