import type { FoodItem, FoodSearchResult } from "@/contracts";
import {
  buildServingChoices,
  defaultQuantityFor,
  GRAMS_SERVING_ID,
  resolveCreateServingFields,
  resolveUpdateServingFields,
} from "../utils/servingChoices";

const catalogItem: FoodItem = {
  id: "food-1",
  name: "Chicken breast, grilled",
  brand: null,
  barcode: null,
  source: "authoritative",
  servingLabel: "1 serving",
  servingGrams: 140,
  nutrients: { calories: 231, proteinG: 43, carbsG: 0, fatG: 5 },
  servingOptions: [
    { id: null, measure: "serving", label: "1 serving", grams: 140, isDefault: true },
    { id: GRAMS_SERVING_ID, measure: "weight", label: "grams", grams: 1, isDefault: false },
    { id: "serving-cup", measure: "cup", label: "1 cup, diced", grams: 190, isDefault: false },
  ],
  isPersonal: false,
  isEstimated: false,
};

const searchResultWithGrams: FoodSearchResult = {
  externalId: "off:123",
  name: "Rolled oats",
  brand: null,
  barcode: null,
  servingLabel: "40g",
  servingGrams: 40,
  nutrients: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3 },
  source: "openfoodfacts",
};

const searchResultNoGrams: FoodSearchResult = {
  ...searchResultWithGrams,
  servingGrams: null,
};

describe("buildServingChoices", () => {
  it("maps a catalog FoodItem's real servingOptions 1:1", () => {
    const choices = buildServingChoices(catalogItem);
    expect(choices).toEqual([
      { key: "default", label: "1 serving", servingId: null, grams: 140 },
      { key: GRAMS_SERVING_ID, label: "grams", servingId: GRAMS_SERVING_ID, grams: 1 },
      { key: "serving-cup", label: "1 cup, diced", servingId: "serving-cup", grams: 190 },
    ]);
  });

  it("synthesizes a default + grams choice for a search result with a known gram weight", () => {
    const choices = buildServingChoices(searchResultWithGrams);
    expect(choices).toEqual([
      { key: "default", label: "40g", servingId: null, grams: 40 },
      { key: GRAMS_SERVING_ID, label: "grams", servingId: null, grams: 1 },
    ]);
  });

  it("omits the grams choice for a search result with no known gram weight", () => {
    const choices = buildServingChoices(searchResultNoGrams);
    expect(choices).toEqual([{ key: "default", label: "40g", servingId: null, grams: null }]);
  });
});

describe("defaultQuantityFor", () => {
  it("resets to the food's reference grams when switching to the grams choice", () => {
    const gramsChoice = buildServingChoices(catalogItem)[1];
    expect(defaultQuantityFor(gramsChoice, 140)).toBe("140");
  });

  it("falls back to 100 grams when no reference is known", () => {
    const gramsChoice = buildServingChoices(catalogItem)[1];
    expect(defaultQuantityFor(gramsChoice, null)).toBe("100");
  });

  it("resets to 1 when switching to any counted (non-grams) choice", () => {
    const cupChoice = buildServingChoices(catalogItem)[2];
    expect(defaultQuantityFor(cupChoice, 140)).toBe("1");
  });
});

describe("resolveCreateServingFields", () => {
  it("sends the real servingId for a catalog item's named option", () => {
    const cupChoice = buildServingChoices(catalogItem)[2];
    expect(resolveCreateServingFields(catalogItem, cupChoice, 2)).toEqual({
      servings: 2,
      servingId: "serving-cup",
      servingUnit: "1 cup, diced",
    });
  });

  it("omits servingId (never sends null) for a catalog item's default option", () => {
    const defaultChoice = buildServingChoices(catalogItem)[0];
    const fields = resolveCreateServingFields(catalogItem, defaultChoice, 1);
    expect(fields).toEqual({ servings: 1, servingUnit: "1 serving", servingId: undefined });
    expect("servingId" in fields).toBe(true);
  });

  it("sends the grams sentinel id for a catalog item's grams choice", () => {
    const gramsChoice = buildServingChoices(catalogItem)[1];
    expect(resolveCreateServingFields(catalogItem, gramsChoice, 250)).toEqual({
      servings: 250,
      servingId: GRAMS_SERVING_ID,
      servingUnit: "grams",
    });
  });

  it("passes a search result's default choice through as a flat multiplier", () => {
    const defaultChoice = buildServingChoices(searchResultWithGrams)[0];
    expect(resolveCreateServingFields(searchResultWithGrams, defaultChoice, 3)).toEqual({
      servings: 3,
      servingUnit: "40g",
    });
  });

  it("computes an equivalent multiplier for a search result's grams choice", () => {
    const gramsChoice = buildServingChoices(searchResultWithGrams)[1];
    // 80 grams / 40 grams-per-serving = 2x the base serving.
    expect(resolveCreateServingFields(searchResultWithGrams, gramsChoice, 80)).toEqual({
      servings: 2,
      servingUnit: "grams",
    });
  });
});

describe("resolveUpdateServingFields", () => {
  it("allows an explicit null servingId to reset back to the item's default", () => {
    const defaultChoice = buildServingChoices(catalogItem)[0];
    expect(resolveUpdateServingFields(defaultChoice, 1)).toEqual({
      servings: 1,
      servingId: null,
      servingUnit: "1 serving",
    });
  });

  it("sends a named serving's id and label", () => {
    const cupChoice = buildServingChoices(catalogItem)[2];
    expect(resolveUpdateServingFields(cupChoice, 2)).toEqual({
      servings: 2,
      servingId: "serving-cup",
      servingUnit: "1 cup, diced",
    });
  });
});
