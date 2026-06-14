import { kgToLb, lbToKg, roundTo } from "../units";

describe("Phase 7 — unit conversions", () => {
  it("converts lb → kg and back losslessly", () => {
    expect(roundTo(lbToKg(220), 2)).toBe(99.79);
    expect(roundTo(kgToLb(lbToKg(150)), 4)).toBe(150);
  });

  it("rounds to the requested precision", () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.2345)).toBe(1.2);
    expect(roundTo(2.5, 0)).toBe(3);
  });
});
