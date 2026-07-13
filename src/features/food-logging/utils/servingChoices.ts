import type { FoodItem, FoodSearchResult } from "@/contracts";

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

function isCatalogFoodItem(item: FoodItem | FoodSearchResult): item is FoodItem {
  return "servingOptions" in item;
}

/**
 * Catalog `FoodItem`s already carry a real `servingOptions` array from the backend
 * (including a "grams" entry). `FoodSearchResult` (pre-catalog search hits) has no
 * such array — only a single fixed serving — so a two-choice list is synthesized
 * client-side (its own serving, plus "grams" if a gram weight is known) mirroring
 * what the backend does for catalog items.
 */
export function buildServingChoices(item: FoodItem | FoodSearchResult): ServingChoice[] {
  if (isCatalogFoodItem(item)) {
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
    return [
      { key: "default", label: item.servingLabel, servingId: null, grams: item.servingGrams },
    ];
  }

  const choices: ServingChoice[] = [
    { key: "default", label: item.servingLabel, servingId: null, grams: item.servingGrams },
  ];
  if (item.servingGrams) {
    choices.push({ key: GRAMS_SERVING_ID, label: "grams", servingId: null, grams: 1 });
  }
  return choices;
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
 *
 * For a `FoodSearchResult`, the backend has no serving-id concept at all: it
 * always treats `servings` as a flat multiplier against the item's one fixed
 * serving. A "grams" choice is simulated by converting the desired gram amount
 * into the equivalent multiplier (grams / gramsPerServing) — nutrients scale
 * linearly, so this produces the same result the backend would if it understood
 * grams directly.
 */
export function resolveCreateServingFields(
  item: FoodItem | FoodSearchResult,
  choice: ServingChoice,
  quantity: number
): CreateServingFields {
  if (isCatalogFoodItem(item)) {
    return {
      servings: quantity,
      servingId: choice.servingId ?? undefined,
      servingUnit: choice.label,
    };
  }

  const servings =
    isGramsChoice(choice) && item.servingGrams ? quantity / item.servingGrams : quantity;
  return { servings, servingUnit: choice.label };
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
