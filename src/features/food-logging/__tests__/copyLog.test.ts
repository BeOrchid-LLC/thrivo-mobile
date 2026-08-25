import type { FoodLogEntry } from "@/contracts";
import {
  buildCopyPlan,
  consumedAtOnDay,
  groupEntriesByMealTime,
  mealTimeForHour,
} from "../utils/copyLog";

/** Built from local wall-clock parts so meal bucketing is timezone-stable. */
function entry(overrides: Partial<FoodLogEntry> & { hour: number; id: string }): FoodLogEntry {
  const { hour, ...rest } = overrides;
  return {
    foodItemId: "food-1",
    servingId: null,
    name: "Oats",
    day: "2026-06-20",
    servings: 1,
    servingUnit: "bowl",
    source: "search",
    barcode: null,
    isEstimated: false,
    isFavorite: false,
    nutrients: { calories: 200, proteinG: 8, carbsG: 30, fatG: 4 },
    consumedAt: new Date(2026, 5, 20, hour, 30, 0).toISOString(),
    loggedAt: new Date(2026, 5, 20, hour, 30, 0).toISOString(),
    ...rest,
  };
}

describe("mealTimeForHour", () => {
  it("maps each window from the shared constant", () => {
    expect(mealTimeForHour(4)).toBe("morning");
    expect(mealTimeForHour(10)).toBe("morning");
    expect(mealTimeForHour(11)).toBe("afternoon");
    expect(mealTimeForHour(15)).toBe("afternoon");
    expect(mealTimeForHour(16)).toBe("evening");
    expect(mealTimeForHour(20)).toBe("evening");
    expect(mealTimeForHour(21)).toBe("night");
  });

  it("wraps midnight into night", () => {
    expect(mealTimeForHour(23)).toBe("night");
    expect(mealTimeForHour(0)).toBe("night");
    expect(mealTimeForHour(3)).toBe("night");
  });
});

describe("groupEntriesByMealTime", () => {
  it("groups in morning-to-night order, skipping empty buckets", () => {
    const groups = groupEntriesByMealTime([
      entry({ id: "a", hour: 19 }),
      entry({ id: "b", hour: 8 }),
      entry({ id: "c", hour: 9 }),
    ]);

    expect(groups.map((group) => group.mealTime)).toEqual(["morning", "evening"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["b", "c"]);
    expect(groups[0].calories).toBe(400);
  });
});

describe("consumedAtOnDay", () => {
  it("keeps the time of day and moves it onto the target day", () => {
    const moved = consumedAtOnDay(new Date(2026, 5, 20, 8, 30, 0).toISOString(), "2026-06-21");
    const asDate = new Date(moved as string);

    expect(asDate.getFullYear()).toBe(2026);
    expect(asDate.getMonth()).toBe(5);
    expect(asDate.getDate()).toBe(21);
    expect(asDate.getHours()).toBe(8);
    expect(asDate.getMinutes()).toBe(30);
  });

  it("returns undefined for an unparseable timestamp instead of throwing", () => {
    expect(consumedAtOnDay("not-a-date", "2026-06-21")).toBeUndefined();
  });
});

describe("buildCopyPlan", () => {
  it("re-logs catalog entries onto the target day, preserving serving and unit", () => {
    const plan = buildCopyPlan(
      [entry({ id: "a", hour: 8, servings: 2, servingId: "serving-cup", servingUnit: "1 cup" })],
      "2026-06-21"
    );

    expect(plan.payloads).toHaveLength(1);
    expect(plan.payloads[0]).toMatchObject({
      foodItemId: "food-1",
      day: "2026-06-21",
      servings: 2,
      servingId: "serving-cup",
      servingUnit: "1 cup",
    });
    expect(plan.skipped).toBe(0);
    expect(plan.calories).toBe(200);
  });

  it("skips entries with no catalog link and reports the count", () => {
    const plan = buildCopyPlan(
      [
        entry({ id: "a", hour: 8 }),
        entry({ id: "b", hour: 13, foodItemId: null, isEstimated: true }),
      ],
      "2026-06-21"
    );

    expect(plan.payloads).toHaveLength(1);
    expect(plan.payloads[0].foodItemId).toBe("food-1");
    expect(plan.skipped).toBe(1);
    // Skipped entries don't count toward the calories the copy will add.
    expect(plan.calories).toBe(200);
  });

  it("sends undefined rather than null for an entry with no serving id", () => {
    const plan = buildCopyPlan([entry({ id: "a", hour: 8, servingId: null })], "2026-06-21");
    expect(plan.payloads[0].servingId).toBeUndefined();
  });
});
