import {
  isValidAgeYears,
  isValidHeightCm,
  isValidWeightKg,
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
