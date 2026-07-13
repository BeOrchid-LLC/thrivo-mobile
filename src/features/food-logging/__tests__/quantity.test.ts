import { parsePositiveQuantity, stepQuantity } from "../utils/quantity";

describe("quantity helpers", () => {
  it("accepts positive whole and fractional quantities", () => {
    expect(parsePositiveQuantity("2")).toBe(2);
    expect(parsePositiveQuantity("0.5")).toBe(0.5);
  });

  it("rejects empty, zero, negative, and non-numeric quantities", () => {
    expect(parsePositiveQuantity("")).toBeNull();
    expect(parsePositiveQuantity("0")).toBeNull();
    expect(parsePositiveQuantity("-1")).toBeNull();
    expect(parsePositiveQuantity("abc")).toBeNull();
  });

  it("steps safely from fractional and empty values", () => {
    expect(stepQuantity("0.5", 1)).toBe("1.5");
    expect(stepQuantity("0.5", -1)).toBe("1");
    expect(stepQuantity("", 1)).toBe("1");
    expect(stepQuantity("", -1)).toBe("1");
  });
});
