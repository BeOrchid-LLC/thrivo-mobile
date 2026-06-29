import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CheckinScreen } from "../screens/CheckinScreen";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockUseCheckins = jest.fn();
const mockUseCreateCheckin = jest.fn();

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
    expect(mutate).toHaveBeenCalledWith({ mood: "good", day: "2026-06-29", note: "felt strong" });
  });

  it("omits an empty note", async () => {
    const mutate = jest.fn();
    mockUseCreateCheckin.mockReturnValue(idleCreate(mutate));

    const { getByText } = render(<CheckinScreen />);
    fireEvent.press(getByText("Great"));
    fireEvent.press(getByText("Save check-in"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith({ mood: "great", day: "2026-06-29", note: undefined });
  });

  it("shows the returned tip after a successful check-in", () => {
    mockUseCreateCheckin.mockReturnValue(
      idleCreate(jest.fn(), {
        data: {
          checkin: {
            id: "c1",
            mood: "ok",
            day: "2026-06-29",
            note: null,
            tip: "Small steps still move you forward.",
            createdAt: "2026-06-29T10:00:00.000Z",
          },
        },
      })
    );

    const { getByText } = render(<CheckinScreen />);
    expect(getByText("Thrivo Tip")).toBeTruthy();
    expect(getByText("Small steps still move you forward.")).toBeTruthy();
  });
});
