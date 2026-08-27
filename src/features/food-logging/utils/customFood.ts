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
export type NumericCustomFoodField = "servingGrams" | "calories" | "proteinG" | "carbsG" | "fatG";

export const NUMERIC_CUSTOM_FOOD_FIELDS: readonly NumericCustomFoodField[] = [
  "servingGrams",
  "calories",
  "proteinG",
  "carbsG",
  "fatG",
];

export const isNumericCustomFoodField = (field: CustomFoodField): field is NumericCustomFoodField =>
  (NUMERIC_CUSTOM_FOOD_FIELDS as readonly CustomFoodField[]).includes(field);

/**
 * The accepted range for each numeric field, and the unit its message states.
 *
 * The macro ceilings mirror the shared `boundedNutrients` contract, so the form
 * never accepts a value the backend would reject.
 */
export const CUSTOM_FOOD_RANGES = {
  servingGrams: { min: 1, max: 10_000, unit: "g" },
  calories: { min: 0, max: 5000, unit: "kcal" },
  proteinG: { min: 0, max: 500, unit: "g" },
  carbsG: { min: 0, max: 800, unit: "g" },
  fatG: { min: 0, max: 500, unit: "g" },
} as const satisfies Record<NumericCustomFoodField, { min: number; max: number; unit: string }>;

/**
 * Strict decimal parse — the same rule the onboarding number fields use.
 *
 * `Number.parseFloat` reads "123abc" as 123 and `Number` reads "1e5" as 100000;
 * neither is what someone typing grams meant. A trailing separator is allowed
 * so the field does not complain half way through "1.5", and a comma reads as
 * one because that is where several locales' keypads put the separator.
 */
export function parseDecimal(value: string): number | undefined {
  const trimmed = value.trim().replace(/,/g, ".");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * What is wrong with a numeric field as it is holding it, in the onboarding
 * rule: the keypad is only a hint — a hardware keyboard or a paste can leave
 * "qe" in the field — so the field says what is wrong rather than silently
 * dropping keystrokes, and nothing is said until there is something to say. An
 * empty field is not an error yet; whether it is *required* is the form's call,
 * made when it is saved.
 */
export function numericFieldError(
  field: NumericCustomFoodField,
  value: string
): string | undefined {
  if (value.trim() === "") return undefined;
  const entered = parseDecimal(value);
  if (entered === undefined) return "Numbers only";
  const { min, max, unit } = CUSTOM_FOOD_RANGES[field];
  if (entered < min || entered > max) return `Enter ${min}–${max} ${unit}`;
  return undefined;
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

export interface CustomFoodValidation {
  /** Null whenever `errors` is non-empty. */
  payload: UpsertFoodPayload | null;
  errors: Partial<Record<CustomFoodField, string>>;
}

/** Blank macros count as zero; a blank calorie field does not. */
function nutrientValue(
  value: string,
  field: "calories" | "proteinG" | "carbsG" | "fatG",
  required: boolean
): { value: number } | { error: string } {
  if (value.trim() === "") {
    if (required) return { error: "Add the calories per serving." };
    return { value: 0 };
  }
  // The same message the field already showed while it was being typed.
  const error = numericFieldError(field, value);
  if (error) return { error };
  return { value: parseDecimal(value) as number };
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
  const servingGramsError = numericFieldError("servingGrams", form.servingGrams);
  if (servingGramsError) errors.servingGrams = servingGramsError;
  else if (form.servingGrams.trim() !== "") servingGrams = parseDecimal(form.servingGrams);

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
