import { queryKeys } from "../query-keys";

describe("Phase 7 — query-key factories", () => {
  it("produces structured, stable keys", () => {
    expect(queryKeys.me()).toEqual(["me"]);
    expect(queryKeys.dashboard.byDay("2026-06-14")).toEqual(["dashboard", "2026-06-14"]);
    expect(queryKeys.foods.search("apple")).toEqual(["foods", "search", "apple"]);
    expect(queryKeys.subscription.me()).toEqual(["subscription", "me"]);
  });

  it("derives day-scoped keys that differ by day (precise invalidation)", () => {
    expect(queryKeys.dashboard.byDay("2026-06-14")).not.toEqual(
      queryKeys.dashboard.byDay("2026-06-15")
    );
  });
});
