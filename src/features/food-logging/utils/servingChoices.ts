import type { FoodItem } from "@/contracts";

/**
 * Mirrors the backend's GRAMS_SERVING_ID sentinel (thrivo-backend/src/lib/nutrition.ts).
 * Selecting this choice means the quantity typed IS the gram amount, not a serving
 * multiplier. Must stay in sync with that literal — it can't be imported cross-repo.
 */
export const GRAMS_SERVING_ID = "grams";

export interface ServingChoice {
  key: string;
  label: string;
  /** What to send as `servingId`. Null means "no explicit serving" (the item's own default reference). */
  servingId: string | null;
  grams: number | null;
}

/**
 * Catalog `FoodItem`s already carry a real `servingOptions` array from the backend
 * (including a "grams" entry).
 */
export function buildServingChoices(item: FoodItem): ServingChoice[] {
  if (item.servingOptions.length > 0) {
    return item.servingOptions.map((option) => ({
      key: option.id ?? "default",
      label: option.label,
      servingId: option.id,
      grams: option.grams,
    }));
  }

  // Real backend responses always populate servingOptions (default + grams at
  // minimum) - this guards against a stale/empty array rather than crashing.
  return [{ key: "default", label: item.servingLabel, servingId: null, grams: item.servingGrams }];
}

function isGramsChoice(choice: ServingChoice): boolean {
  return choice.servingId === GRAMS_SERVING_ID || choice.key === GRAMS_SERVING_ID;
}

/**
 * The "switching units shouldn't leave a nonsensical quantity" rule: switching to
 * a counted unit (a named serving/cup/tbsp/piece) resets to 1 of that unit;
 * switching to raw weight resets to the food's own reference gram amount.
 */
export function defaultQuantityFor(choice: ServingChoice, referenceGrams: number | null): string {
  if (isGramsChoice(choice)) return String(referenceGrams ?? 100);
  return "1";
}

export interface CreateServingFields {
  servings: number;
  servingId?: string;
  servingUnit: string;
}

/**
 * Fields to merge into a `LogFoodPayload` for the selected choice/quantity.
 * `servingId` must be `undefined` (never `null`) here — the create schema's
 * `servingId` is a plain optional string, unlike the update schema.
 */
export function resolveCreateServingFields(
  item: FoodItem,
  choice: ServingChoice,
  quantity: number
): CreateServingFields {
  void item;
  return {
    servings: quantity,
    servingId: choice.servingId ?? undefined,
    servingUnit: choice.label,
  };
}

export interface UpdateServingFields {
  servings: number;
  servingId: string | null;
  servingUnit: string;
}

/**
 * Fields to merge into an `UpdateLogPayload` when the user actively changed the
 * unit. Only used for catalog-backed entries (see EditFoodLogSheet) — `servingId`
 * is nullable here (unlike create) so choosing the item's own default explicitly
 * clears back to `null` instead of leaving a stale prior selection.
 */
export function resolveUpdateServingFields(
  choice: ServingChoice,
  quantity: number
): UpdateServingFields {
  return { servings: quantity, servingId: choice.servingId, servingUnit: choice.label };
}
