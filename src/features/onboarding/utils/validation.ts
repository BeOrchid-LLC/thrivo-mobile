import { updateProfilePayload } from "@/contracts";

/**
 * Onboarding numeric validation reuses the **published contract** field schemas
 * (the same Zod the server validates with) so the client and server agree on the
 * boundary — no NaN/absurd value can reach TDEE. We unwrap the optional wrapper
 * to validate a concrete entered value (parsed number, possibly NaN).
 */
const weightSchema = updateProfilePayload.shape.currentWeightKg.unwrap();
const heightSchema = updateProfilePayload.shape.heightCm.unwrap();
const ageSchema = updateProfilePayload.shape.ageYears.unwrap();

export const isValidWeightKg = (value: number): boolean => weightSchema.safeParse(value).success;
export const isValidHeightCm = (value: number): boolean => heightSchema.safeParse(value).success;
export const isValidAgeYears = (value: number): boolean => ageSchema.safeParse(value).success;
