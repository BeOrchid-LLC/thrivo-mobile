import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CheckinScreen } from "../screens/CheckinScreen";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockUseCheckins = jest.fn();
const mockUseCreateCheckin = jest.fn();
const mockUseDashboardStreak = jest.fn();

const checkin = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  mood: "ok",
  day: "2026-06-29",
  note: null,
  tip: null,
  createdAt: "2026-06-29T10:00:00.000Z",
  ...overrides,
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
}));

jest.mock("@/hooks/useCurrentDay", () => ({
  useCurrentDay: () => "2026-06-29",
}));

jest.mock("../hooks/useCheckin", () => ({
  useCheckins: () => mockUseCheckins(),
  useCreateCheckin: () => mockUseCreateCheckin(),
}));

jest.mock("@/features/dashboard", () => ({
  useDashboardStreak: () => mockUseDashboardStreak(),
}));

const idleCreate = (mutate: jest.Mock, overrides: Record<string, unknown> = {}) => ({
  mutate,
  isPending: false,
  isError: false,
  data: undefined,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCheckins.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseDashboardStreak.mockReturnValue({ data: { currentStreakDays: 1 } });
});

describe("CheckinScreen", () => {
  it("submits the selected mood and note for today", async () => {
    const mutate = jest.fn();
    mockUseCreateCheckin.mockReturnValue(idleCreate(mutate));

    const { getByText, getByPlaceholderText } = render(<CheckinScreen />);

    fireEvent.press(getByText("Good"));
    fireEvent.changeText(getByPlaceholderText("A note to your future self…"), "  felt strong  ");
    fireEvent.press(getByText("Save check-in"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(
      { mood: "good", day: "2026-06-29", note: "felt strong" },
      expect.any(Object)
    );
  });

  it("omits an empty note", async () => {
    const mutate = jest.fn();
    mockUseCreateCheckin.mockReturnValue(idleCreate(mutate));

    const { getByText } = render(<CheckinScreen />);
    fireEvent.press(getByText("Great"));
    fireEvent.press(getByText("Save check-in"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(
      { mood: "great", day: "2026-06-29", note: undefined },
      expect.any(Object)
    );
  });

  it("shows the returned tip after a successful check-in", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), {
        data: { checkin: checkin({ tip: "Small steps still move you forward." }) },
      })
    );

    const { getByText } = render(<CheckinScreen />);
    expect(getByText("Thrivo Tip")).toBeTruthy();
    expect(getByText("Small steps still move you forward.")).toBeTruthy();
  });

  it("responds differently to a low mood than to a positive one", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ mood: "great" }) } })
    );
    const positive = render(<CheckinScreen />);
    expect(positive.getByText("Brilliant — hold onto this one.")).toBeTruthy();

    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ mood: "bad" }) } })
    );
    const low = render(<CheckinScreen />);
    expect(low.getByText("That sounds like a hard one.")).toBeTruthy();
    // The PRD's acceptance criterion is exactly this: the two must differ.
    expect(low.queryByText("Brilliant — hold onto this one.")).toBeNull();
  });

  it("still says something useful when the backend returns no tip", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ mood: "low", tip: null }) } })
    );

    const { getByText, queryByText } = render(<CheckinScreen />);
    expect(queryByText("Thrivo Tip")).toBeNull();
    expect(getByText("Thanks for being honest.")).toBeTruthy();
  });

  it("shows today's response on a revisit, not the empty form", () => {
    // `create.data` is gone once the screen remounts; history is the only source.
    mockUseCreateCheckin.mockReturnValue(idleCreate(jest.fn()));
    mockUseCheckins.mockReturnValue({
      data: [checkin({ mood: "good", tip: "Keep it simple today." })],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { getByText, queryByText } = render(<CheckinScreen />);
    expect(getByText("Good to hear.")).toBeTruthy();
    expect(getByText("Keep it simple today.")).toBeTruthy();
    expect(queryByText("Save check-in")).toBeNull();
  });

  it("re-opens the form seeded with today's answer, and can back out", () => {
    const mutate = jest.fn();
    mockUseCreateCheckin.mockReturnValue(idleCreate(mutate));
    mockUseCheckins.mockReturnValue({
      data: [checkin({ mood: "good", note: "felt strong" })],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { getByText, getByPlaceholderText, queryByText } = render(<CheckinScreen />);
    fireEvent.press(getByText("Change how you’re feeling"));

    expect(getByPlaceholderText("A note to your future self…").props.value).toBe("felt strong");
    fireEvent.press(getByText("Update check-in"));
    expect(mutate).toHaveBeenCalledWith(
      { mood: "good", day: "2026-06-29", note: "felt strong" },
      expect.any(Object)
    );

    fireEvent.press(getByText("Cancel"));
    expect(getByText("Good to hear.")).toBeTruthy();
    expect(queryByText("Update check-in")).toBeNull();
  });

  it("falls back to the form when the day rolls over past a submission", () => {
    // `useCurrentDay` re-renders this screen at midnight, but `create.data`
    // still holds yesterday's check-in. Yesterday's response is not today's.
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ day: "2026-06-28", mood: "great" }) } })
    );

    const { getByText, queryByText } = render(<CheckinScreen />);
    expect(queryByText("Brilliant — hold onto this one.")).toBeNull();
    expect(getByText("Save check-in")).toBeTruthy();
  });

  it("celebrates a streak milestone on an exact hit only", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ mood: "good" }) } })
    );

    mockUseDashboardStreak.mockReturnValue({ data: { currentStreakDays: 7 } });
    expect(render(<CheckinScreen />).getByText("A full week")).toBeTruthy();

    // Day 8 must not re-fire day 7's congratulation.
    mockUseDashboardStreak.mockReturnValue({ data: { currentStreakDays: 8 } });
    expect(render(<CheckinScreen />).queryByText("A full week")).toBeNull();
  });

  it("renders without a milestone when the streak has not loaded", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), { data: { checkin: checkin({ mood: "good" }) } })
    );
    mockUseDashboardStreak.mockReturnValue({ data: undefined });

    expect(render(<CheckinScreen />).getByText("Good to hear.")).toBeTruthy();
  });
});
