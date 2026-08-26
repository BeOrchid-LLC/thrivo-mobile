import {
  EMPTY_CUSTOM_FOOD,
  numericFieldError,
  parseDecimal,
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

describe("parseDecimal", () => {
  it("refuses anything that is not wholly a number", () => {
    expect(parseDecimal("sdf")).toBeUndefined();
    expect(parseDecimal("12abc3")).toBeUndefined();
    expect(parseDecimal("-5")).toBeUndefined();
    // `Number("1e5")` is 100000, which is never what someone typing grams meant.
    expect(parseDecimal("1e5")).toBeUndefined();
  });

  it("reads a comma as the decimal separator", () => {
    expect(parseDecimal("1,5")).toBe(1.5);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal("1,5.2")).toBeUndefined();
  });

  it("accepts a partially typed number so the field stays quiet mid-entry", () => {
    expect(parseDecimal("12.")).toBe(12);
    expect(parseDecimal("")).toBeUndefined();
  });
});

describe("numericFieldError", () => {
  it("says nothing about an empty field", () => {
    expect(numericFieldError("calories", "")).toBeUndefined();
    expect(numericFieldError("calories", "   ")).toBeUndefined();
  });

  it("names the problem rather than dropping the keystrokes", () => {
    expect(numericFieldError("calories", "sdf")).toBe("Numbers only");
    expect(numericFieldError("calories", "12abc3")).toBe("Numbers only");
  });

  it("states the accepted range once the value parses", () => {
    expect(numericFieldError("calories", "5001")).toBe("Enter 0\u20135000 kcal");
    expect(numericFieldError("proteinG", "501")).toBe("Enter 0\u2013500 g");
    expect(numericFieldError("servingGrams", "0")).toBe("Enter 1\u201310000 g");
    expect(numericFieldError("servingGrams", "250")).toBeUndefined();
  });
});
