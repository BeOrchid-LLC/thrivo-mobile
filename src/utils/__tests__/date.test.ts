import { addDays, isToday, localDay } from "../date";

describe("Phase 7 — local-day helpers", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    // Construct in local time to avoid UTC drift.
    expect(localDay(new Date(2026, 5, 14))).toBe("2026-06-14");
    expect(localDay(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("adds and subtracts days across month boundaries", () => {
    expect(addDays("2026-06-14", 1)).toBe("2026-06-15");
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("identifies today", () => {
    expect(isToday(localDay())).toBe(true);
    expect(isToday("2000-01-01")).toBe(false);
  });
});
