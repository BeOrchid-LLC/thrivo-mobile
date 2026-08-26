import {
  AGE_RANGE_YEARS,
  HEIGHT_RANGE_CM,
  WEIGHT_RANGE_KG,
  isValidAgeYears,
  isValidHeightCm,
  isValidWeightKg,
  parseDecimal,
  parsePositiveInteger,
} from "../utils/validation";

describe("onboarding numeric validation (contract-backed)", () => {
  it("rejects NaN from non-numeric input", () => {
    expect(isValidWeightKg(Number.parseFloat("abc"))).toBe(false);
    expect(isValidHeightCm(Number.parseFloat(""))).toBe(false);
    expect(isValidAgeYears(Number.parseInt("not-a-number", 10))).toBe(false);
  });

  it("rejects non-positive weight/height", () => {
    expect(isValidWeightKg(0)).toBe(false);
    expect(isValidWeightKg(-5)).toBe(false);
    expect(isValidHeightCm(0)).toBe(false);
  });

  it("enforces the minimum age (13) from the contract", () => {
    expect(isValidAgeYears(12)).toBe(false);
    expect(isValidAgeYears(13)).toBe(true);
    expect(isValidAgeYears(30.5)).toBe(false); // contract requires an integer
  });

  it("accepts plausible values", () => {
    expect(isValidWeightKg(70)).toBe(true);
    expect(isValidHeightCm(175)).toBe(true);
    expect(isValidAgeYears(28)).toBe(true);
  });

  it("strictly parses positive whole calorie targets", () => {
    expect(parsePositiveInteger("2000")).toBe(2000);
    expect(parsePositiveInteger("0.5")).toBeUndefined();
    expect(parsePositiveInteger("")).toBeUndefined();
    expect(parsePositiveInteger("2e3")).toBeUndefined();
  });
});

describe("plausibility bounds on top of the contract", () => {
  it("rejects a typo the contract would accept", () => {
    // The published schema only asks for a positive number, so this is a valid
    // payload — it is the UI that has to stop it.
    expect(isValidWeightKg(12323123)).toBe(false);
    expect(isValidWeightKg(WEIGHT_RANGE_KG.max + 1)).toBe(false);
    expect(isValidWeightKg(WEIGHT_RANGE_KG.min - 1)).toBe(false);
    expect(isValidHeightCm(400)).toBe(false);
    expect(isValidAgeYears(AGE_RANGE_YEARS.max + 1)).toBe(false);
  });

  it("accepts both ends of the range", () => {
    expect(isValidWeightKg(WEIGHT_RANGE_KG.min)).toBe(true);
    expect(isValidWeightKg(WEIGHT_RANGE_KG.max)).toBe(true);
    expect(isValidHeightCm(HEIGHT_RANGE_CM.min)).toBe(true);
    expect(isValidAgeYears(AGE_RANGE_YEARS.max)).toBe(true);
  });
});

describe("parseDecimal", () => {
  it("refuses what parseFloat would salvage", () => {
    // `Number.parseFloat("123abc")` is 123 — the case a hardware keyboard makes
    // reachable, and the reason the screens do not use it.
    expect(parseDecimal("123abc")).toBeUndefined();
    expect(parseDecimal("qe")).toBeUndefined();
    expect(parseDecimal("")).toBeUndefined();
  });

  it("reads a number mid-typing", () => {
    expect(parseDecimal("70")).toBe(70);
    expect(parseDecimal("70.")).toBe(70);
    expect(parseDecimal("70.5")).toBe(70.5);
    expect(parseDecimal(" 70.5 ")).toBe(70.5);
  });
});
