import {
  EMPTY_CUSTOM_FOOD,
  sanitizeDecimalInput,
  validateCustomFood,
  type CustomFoodForm,
} from "../utils/customFood";

const valid: CustomFoodForm = {
  name: "  Jollof rice  ",
  brand: " Mum ",
  servingLabel: " 1 bowl ",
  servingGrams: "250",
  calories: "420",
  proteinG: "12",
  carbsG: "60",
  fatG: "14",
};

describe("validateCustomFood", () => {
  it("trims and builds the upsert payload", () => {
    const { payload, errors } = validateCustomFood(valid);

    expect(errors).toEqual({});
    expect(payload).toEqual({
      name: "Jollof rice",
      brand: "Mum",
      servingLabel: "1 bowl",
      servingGrams: 250,
      nutrients: { calories: 420, proteinG: 12, carbsG: 60, fatG: 14 },
    });
  });

  it("requires a name, a serving and calories", () => {
    const { payload, errors } = validateCustomFood(EMPTY_CUSTOM_FOOD);

    expect(payload).toBeNull();
    expect(errors.name).toBeTruthy();
    expect(errors.servingLabel).toBeTruthy();
    expect(errors.calories).toBeTruthy();
  });

  it("treats blank macros as zero but omits a blank brand and serving weight", () => {
    const { payload } = validateCustomFood({
      ...valid,
      brand: "   ",
      servingGrams: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
    });

    expect(payload).toEqual({
      name: "Jollof rice",
      brand: undefined,
      servingLabel: "1 bowl",
      servingGrams: undefined,
      nutrients: { calories: 420, proteinG: 0, carbsG: 0, fatG: 0 },
    });
  });

  it("rejects nutrients the backend would reject", () => {
    expect(validateCustomFood({ ...valid, calories: "5001" }).errors.calories).toBeTruthy();
    expect(validateCustomFood({ ...valid, proteinG: "501" }).errors.proteinG).toBeTruthy();
    expect(validateCustomFood({ ...valid, carbsG: "801" }).errors.carbsG).toBeTruthy();
    expect(validateCustomFood({ ...valid, fatG: "-1" }).errors.fatG).toBeTruthy();
    expect(validateCustomFood({ ...valid, calories: "abc" }).errors.calories).toBeTruthy();
  });

  it("rejects a non-positive serving weight", () => {
    expect(validateCustomFood({ ...valid, servingGrams: "0" }).errors.servingGrams).toBeTruthy();
    expect(
      validateCustomFood({ ...valid, servingGrams: "20000" }).errors.servingGrams
    ).toBeTruthy();
  });
});

describe("sanitizeDecimalInput", () => {
  it("drops anything that is not part of a number", () => {
    expect(sanitizeDecimalInput("sdf")).toBe("");
    expect(sanitizeDecimalInput("12abc3")).toBe("123");
    expect(sanitizeDecimalInput("-5")).toBe("5");
  });

  it("accepts a comma as the decimal separator and keeps only the first point", () => {
    expect(sanitizeDecimalInput("1,5")).toBe("1.5");
    expect(sanitizeDecimalInput("1,5.2")).toBe("1.52");
    expect(sanitizeDecimalInput("12.5")).toBe("12.5");
  });

  it("leaves a partially typed number alone", () => {
    expect(sanitizeDecimalInput("12.")).toBe("12.");
    expect(sanitizeDecimalInput("")).toBe("");
  });
});
