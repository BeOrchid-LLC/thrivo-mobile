import { act, fireEvent, render } from "@testing-library/react-native";
import NameStep from "../screens/NameStep";
import { STEP_NUMBER } from "../config";

const mockSubmit = jest.fn();
const mockSetFields = jest.fn();
const mockSetIsOnboardingSkipped = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    canGoBack: jest.fn(() => false),
  },
}));

jest.mock("@/features/onboarding/hooks/useCompleteOnboarding", () => ({
  useSubmitOnboarding: () => ({ submit: mockSubmit, isPending: false }),
}));

const mockDraft: { firstName?: string } = {};
jest.mock("@/features/onboarding/hooks/useOnboardingPrefill", () => ({
  useOnboardingPrefill: () => ({ draft: mockDraft }),
}));

jest.mock("@/stores", () => ({
  useOnboardingDraftActions: () => ({ setFields: (...a: unknown[]) => mockSetFields(...a) }),
  useSessionActions: () => ({
    setIsOnboardingSkipped: (...a: unknown[]) => mockSetIsOnboardingSkipped(...a),
  }),
}));

/** The step seeds its field from the draft in an effect, so let that tick land. */
async function renderStep(props: Record<string, unknown> = {}) {
  const screen = render(<NameStep {...props} />);
  await act(async () => {});
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete mockDraft.firstName;
  mockSubmit.mockResolvedValue(undefined);
});

describe("NameStep", () => {
  it("holds Continue until a name is entered", async () => {
    const screen = await renderStep();

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText("First name"), "Alex");

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("treats a whitespace-only name as empty, the way the contract does", async () => {
    const screen = await renderStep();
    fireEvent.changeText(screen.getByLabelText("First name"), "   ");

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("saves the trimmed name to the draft and moves on to the goal step", async () => {
    const screen = await renderStep();
    fireEvent.changeText(screen.getByLabelText("First name"), "  Alex  ");
    fireEvent.press(screen.getByText("Continue"));

    expect(mockSetFields).toHaveBeenCalledWith({
      firstName: "Alex",
      onboardingStep: STEP_NUMBER.name,
    });
    expect(mockPush).toHaveBeenCalledWith("/(onboarding)/goal");
  });

  it("prefills the name already on the profile", async () => {
    mockDraft.firstName = "Ada";
    const screen = await renderStep();

    expect(screen.getByLabelText("First name").props.value).toBe("Ada");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("hands the fields back to the caller in the Settings revisit path", async () => {
    const onNext = jest.fn();
    const screen = await renderStep({ mode: "revisit", onNext });
    fireEvent.changeText(screen.getByLabelText("First name"), "Alex");
    fireEvent.press(screen.getByText("Continue"));

    expect(onNext).toHaveBeenCalledWith({ firstName: "Alex", onboardingStep: STEP_NUMBER.name });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("keeps a half-typed answer when the step is skipped", async () => {
    const screen = await renderStep();
    fireEvent.changeText(screen.getByLabelText("First name"), "Alex");
    fireEvent.press(screen.getByText("Skip for now"));

    expect(mockSetIsOnboardingSkipped).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/dashboard");
    expect(mockSubmit).toHaveBeenCalledWith("skip", {
      silent: true,
      onboardingStep: STEP_NUMBER.name,
      fields: { firstName: "Alex" },
    });
  });

  it("skips with no fields when nothing was typed", async () => {
    const screen = await renderStep();
    fireEvent.press(screen.getByText("Skip for now"));

    expect(mockSubmit).toHaveBeenCalledWith("skip", {
      silent: true,
      onboardingStep: STEP_NUMBER.name,
      fields: undefined,
    });
  });
});
