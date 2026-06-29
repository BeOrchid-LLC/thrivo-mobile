import { isValidAgeYears, isValidHeightCm, isValidWeightKg } from "../utils/validation";

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
});
