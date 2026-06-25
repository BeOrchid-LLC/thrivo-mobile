import { render } from "@testing-library/react-native";
import NameStep from "../../../../app/(onboarding)/name";

const mockSetFields = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/features/profile", () => ({
  useMe: () => ({ data: { name: "Ada Lovelace" } }),
}));

jest.mock("@/features/onboarding/hooks/useCompleteOnboarding", () => ({
  useSubmitOnboarding: () => ({ submit: jest.fn(), isPending: false }),
}));

jest.mock("@/stores", () => ({
  useOnboardingDraft: () => ({ firstName: "Grace Hopper" }),
  useOnboardingDraftActions: () => ({ setFields: mockSetFields }),
  useSessionActions: () => ({ setIsOnboardingSkipped: jest.fn() }),
}));

describe("NameStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("labels the field as Name and prefills the stored full name", () => {
    const screen = render(<NameStep />);

    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByDisplayValue("Grace Hopper")).toBeTruthy();
  });
});
