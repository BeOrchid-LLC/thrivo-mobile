import {
  invalidateFoodLogViews,
  invalidateWaterViews,
  invalidateWeightViews,
} from "../invalidation";

const makeClient = () =>
  ({
    invalidateQueries: jest.fn(),
  }) as unknown as Parameters<typeof invalidateFoodLogViews>[0];

describe("query invalidation helpers", () => {
  it("refreshes all food-dependent views", () => {
    const client = makeClient();

    invalidateFoodLogViews(client, "2026-06-28");

    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["foods", "log", "day", "2026-06-28"],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "streak"],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metrics", "progress", "2026-06-28"],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metrics", "chart"],
    });
  });

  it("refreshes water-dependent views", () => {
    const client = makeClient();

    invalidateWaterViews(client, "2026-06-28");

    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metrics", "water", "2026-06-28"],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metrics", "chart"],
    });
  });

  it("refreshes weight-dependent views", () => {
    const client = makeClient();

    invalidateWeightViews(client, "2026-06-28");

    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metrics", "weight", "context", "2026-06-28"],
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["me"] });
  });
});
