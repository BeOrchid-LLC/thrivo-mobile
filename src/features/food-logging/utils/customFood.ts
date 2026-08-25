import type { UpsertFoodPayload } from "@/contracts";

/**
 * The create-a-food form, as typed. Everything is a string here — parsing and
 * bounds live in `validateCustomFood` so the screen stays presentational and
 * the rules are unit-testable.
 */
export interface CustomFoodForm {
  name: string;
  brand: string;
  servingLabel: string;
  servingGrams: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

export type CustomFoodField = keyof CustomFoodForm;

/** The fields that only ever hold a number. */
export const NUMERIC_CUSTOM_FOOD_FIELDS: readonly CustomFoodField[] = [
  "servingGrams",
  "calories",
  "proteinG",
  "carbsG",
  "fatG",
];

/**
 * Keeps a numeric field numeric as it is typed.
 *
 * `keyboardType="decimal-pad"` is a hint, not a constraint — an Android soft
 * keyboard, a hardware keyboard, or a paste can all put letters in the field,
 * and the user only finds out when saving fails. Commas become dots (many
 * locales' decimal separator sits where the dot is expected) and every later
 * dot is dropped, so "1,5.2" types as "1.52" rather than an unparseable string.
 */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}

export const EMPTY_CUSTOM_FOOD: CustomFoodForm = {
  name: "",
  brand: "",
  servingLabel: "",
  servingGrams: "",
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
};

const NAME_MAX = 160;
const SERVING_LABEL_MAX = 80;
const SERVING_GRAMS_MAX = 10_000;

/**
 * Macro ceilings mirror the shared `boundedNutrients` contract, so the form
 * never accepts a value the backend would reject.
 */
const NUTRIENT_MAX = { calories: 5000, proteinG: 500, carbsG: 800, fatG: 500 } as const;

export interface CustomFoodValidation {
  /** Null whenever `errors` is non-empty. */
  payload: UpsertFoodPayload | null;
  errors: Partial<Record<CustomFoodField, string>>;
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Blank macros count as zero; a blank calorie field does not. */
function nutrientValue(
  value: string,
  field: "calories" | "proteinG" | "carbsG" | "fatG",
  required: boolean
): { value: number } | { error: string } {
  const trimmed = value.trim();
  if (trimmed === "") {
    if (required) return { error: "Add the calories per serving." };
    return { value: 0 };
  }
  const parsed = parseNumber(trimmed);
  const max = NUTRIENT_MAX[field];
  if (parsed === null || parsed < 0 || parsed > max) {
    return { error: `Enter a number between 0 and ${max}.` };
  }
  return { value: parsed };
}

/**
 * Validates the create-a-food form into an `UpsertFoodPayload`. Nutrients are
 * per one serving of `servingLabel` — the same reference the log sheet scales
 * from.
 */
export function validateCustomFood(form: CustomFoodForm): CustomFoodValidation {
  const errors: Partial<Record<CustomFoodField, string>> = {};

  const name = form.name.trim();
  if (name.length === 0) errors.name = "Add a food name.";
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;

  const brand = form.brand.trim();

  const servingLabel = form.servingLabel.trim();
  if (servingLabel.length === 0) errors.servingLabel = "Add a serving, e.g. “1 cup” or “100g”.";
  else if (servingLabel.length > SERVING_LABEL_MAX)
    errors.servingLabel = `Keep the serving under ${SERVING_LABEL_MAX} characters.`;

  let servingGrams: number | undefined;
  if (form.servingGrams.trim() !== "") {
    const parsed = parseNumber(form.servingGrams);
    if (parsed === null || parsed <= 0 || parsed > SERVING_GRAMS_MAX) {
      errors.servingGrams = `Enter a weight between 1 and ${SERVING_GRAMS_MAX} grams.`;
    } else {
      servingGrams = parsed;
    }
  }

  const calories = nutrientValue(form.calories, "calories", true);
  const proteinG = nutrientValue(form.proteinG, "proteinG", false);
  const carbsG = nutrientValue(form.carbsG, "carbsG", false);
  const fatG = nutrientValue(form.fatG, "fatG", false);
  if ("error" in calories) errors.calories = calories.error;
  if ("error" in proteinG) errors.proteinG = proteinG.error;
  if ("error" in carbsG) errors.carbsG = carbsG.error;
  if ("error" in fatG) errors.fatG = fatG.error;

  if (
    Object.keys(errors).length > 0 ||
    "error" in calories ||
    "error" in proteinG ||
    "error" in carbsG ||
    "error" in fatG
  ) {
    return { payload: null, errors };
  }

  return {
    payload: {
      name,
      brand: brand === "" ? undefined : brand,
      servingLabel,
      servingGrams,
      nutrients: {
        calories: calories.value,
        proteinG: proteinG.value,
        carbsG: carbsG.value,
        fatG: fatG.value,
      },
    },
    errors,
  };
}
