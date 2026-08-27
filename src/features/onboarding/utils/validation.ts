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

/**
 * Plausibility bounds the **client** adds on top of the contract.
 *
 * The published schema only asks for a positive number, so `12323123` kg is a
 * valid payload as far as the server is concerned — it just makes the weight
 * insight ("12,323,000 kg gap · ~12,323,000 weeks") and the calorie target
 * nonsense. These are deliberately generous: they catch a typo or a pasted
 * phone number, not an unusual body. The server stays the authority on what it
 * will store; widen or move them here without needing a contracts release.
 */
export const WEIGHT_RANGE_KG = { min: 20, max: 500 } as const;
export const HEIGHT_RANGE_CM = { min: 60, max: 272 } as const;
/** The contract sets the 13 floor (COPPA); the ceiling is ours. */
export const AGE_RANGE_YEARS = { min: 13, max: 120 } as const;
export const TARGET_RANGE_KCAL = { min: 500, max: 10000 } as const;

const inRange = (value: number, { min, max }: { min: number; max: number }): boolean =>
  value >= min && value <= max;

export const isValidWeightKg = (value: number): boolean =>
  weightSchema.safeParse(value).success && inRange(value, WEIGHT_RANGE_KG);
export const isValidHeightCm = (value: number): boolean =>
  heightSchema.safeParse(value).success && inRange(value, HEIGHT_RANGE_CM);
export const isValidAgeYears = (value: number): boolean =>
  ageSchema.safeParse(value).success && inRange(value, AGE_RANGE_YEARS);

/**
 * Strict decimal parse. `Number.parseFloat` reads "123abc" as 123, which is
 * exactly the input these screens have to reject — a trailing separator is
 * allowed so the field does not complain mid-way through "70.5".
 */
export const parseDecimal = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parsePositiveInteger = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};
