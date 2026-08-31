import { formatNumber } from "../number";

describe("formatNumber", () => {
  it("groups thousands with a comma regardless of device locale", () => {
    expect(formatNumber(1800)).toBe("1,800");
    expect(formatNumber(1340)).toBe("1,340");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("leaves numbers below a thousand ungrouped", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(460)).toBe("460");
  });

  it("keeps at most three fraction digits, without trailing zeros", () => {
    expect(formatNumber(1.5)).toBe("1.5");
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(2500.4567)).toBe("2,500.457");
  });

  it("groups negatives and survives non-finite input", () => {
    expect(formatNumber(-1800)).toBe("-1,800");
    expect(formatNumber(Number.NaN)).toBe("0");
  });
});
