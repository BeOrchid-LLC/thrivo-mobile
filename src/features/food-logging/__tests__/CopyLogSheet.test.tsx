import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { FoodLogEntry } from "@/contracts";
import { CopyLogSheet } from "../components/CopyLogSheet";

const mockUseFoodLogDay = jest.fn();
const mockCopy = jest.fn();

jest.mock("../hooks/useFoodLogging", () => ({
  useFoodLogDay: (...args: unknown[]) => mockUseFoodLogDay(...args),
  useCopyFoodLog: () => ({ copy: mockCopy, isCopying: false }),
}));

jest.mock("@/hooks/useCurrentDay", () => ({ useCurrentDay: () => "2026-06-21" }));

function entry(overrides: Partial<FoodLogEntry> & { id: string; hour: number }): FoodLogEntry {
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
    consumedAt: new Date(2026, 5, 20, hour, 0, 0).toISOString(),
    loggedAt: new Date(2026, 5, 20, hour, 0, 0).toISOString(),
    ...rest,
  };
}

const breakfast = entry({ id: "a", hour: 8 });
const dinner = entry({
  id: "b",
  hour: 19,
  nutrients: { calories: 600, proteinG: 30, carbsG: 50, fatG: 20 },
});

function mockDay(entries: FoodLogEntry[], overrides: Record<string, unknown> = {}) {
  mockUseFoodLogDay.mockReturnValue({
    data: { day: "2026-06-20", entries, isLocked: false, ...overrides },
    isLoading: false,
    isError: false,
  });
}

describe("CopyLogSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCopy.mockResolvedValue({ copied: 2, failed: 0, skipped: 0, queued: 0 });
  });

  it("offers the whole day and each meal block that has entries", () => {
    mockDay([breakfast, dinner]);

    const screen = render(<CopyLogSheet day="2026-06-20" visible onClose={jest.fn()} />);

    expect(screen.getByText("Whole day · 2 items · 800 kcal")).toBeTruthy();
    expect(screen.getByText("Morning · 1 item · 200 kcal")).toBeTruthy();
    expect(screen.getByText("Evening · 1 item · 600 kcal")).toBeTruthy();
    expect(screen.queryByText(/Afternoon/)).toBeNull();
  });

  it("copies the whole day onto today and closes", async () => {
    mockDay([breakfast, dinner]);
    const onClose = jest.fn();

    const screen = render(<CopyLogSheet day="2026-06-20" visible onClose={onClose} />);
    fireEvent.press(screen.getByText("Copy 2 items · 800 kcal"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockCopy).toHaveBeenCalledWith([breakfast, dinner], "2026-06-21", "day");
  });

  it("copies only the selected meal block", async () => {
    mockDay([breakfast, dinner]);
    mockCopy.mockResolvedValue({ copied: 1, failed: 0, skipped: 0, queued: 0 });

    const screen = render(<CopyLogSheet day="2026-06-20" visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("Evening · 1 item · 600 kcal"));
    fireEvent.press(screen.getByText("Copy 1 item · 600 kcal"));

    await waitFor(() => expect(mockCopy).toHaveBeenCalledWith([dinner], "2026-06-21", "meal"));
  });

  it("reports estimates it cannot copy and leaves them out of the count", () => {
    mockDay([breakfast, entry({ id: "c", hour: 13, foodItemId: null, isEstimated: true })]);

    const screen = render(<CopyLogSheet day="2026-06-20" visible onClose={jest.fn()} />);

    expect(screen.getByText(/1 described meal can’t be copied/)).toBeTruthy();
    expect(screen.getByText("Copy 1 item · 200 kcal")).toBeTruthy();
  });

  it("stays open when nothing could be copied", async () => {
    mockDay([breakfast]);
    mockCopy.mockResolvedValue({ copied: 0, failed: 1, skipped: 0, queued: 0 });
    const onClose = jest.fn();

    const screen = render(<CopyLogSheet day="2026-06-20" visible onClose={onClose} />);
    fireEvent.press(screen.getByText("Copy 1 item · 200 kcal"));

    await waitFor(() => expect(mockCopy).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("explains a locked day instead of offering a copy", () => {
    mockDay([], { isLocked: true });

    const screen = render(<CopyLogSheet day="2026-01-02" visible onClose={jest.fn()} />);

    expect(screen.getByText(/outside your free history window/)).toBeTruthy();
    // The title still reads "Copy <date>"; what must be absent is the action.
    expect(screen.queryByText(/^Copy \d+ item/)).toBeNull();
  });
});
