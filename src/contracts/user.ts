import { z } from "zod";
import { idSchema, isoDateSchema } from "./common";

export const goalSchema = z.enum(["lose", "maintain", "gain"]);
export type Goal = z.infer<typeof goalSchema>;

export const sexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof sexSchema>;

export const unitSystemSchema = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof unitSystemSchema>;

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
  name: z.string().nullable(),
  goal: goalSchema.nullable(),
  unitSystem: unitSystemSchema.default("metric"),
  /** Onboarding progress step; null/undefined → not started. */
  onboardingStep: z.number().int().nullable(),
  isOnboarded: z.boolean(),
  targets: targetsSchema.nullable(),
  createdAt: isoDateSchema,
});
export type User = z.infer<typeof userSchema>;

/** Onboarding profile submission; server recomputes TDEE/targets. */
export const updateProfilePayload = z.object({
  goal: goalSchema.optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  ageYears: z.number().int().positive().optional(),
  sex: sexSchema.optional(),
  unitSystem: unitSystemSchema.optional(),
  onboardingStep: z.number().int().optional(),
});
export type UpdateProfilePayload = z.infer<typeof updateProfilePayload>;

export const meResponse = z.object({ user: userSchema });
export type MeResponse = z.infer<typeof meResponse>;
