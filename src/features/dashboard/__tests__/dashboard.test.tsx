import { fireEvent, render } from "@testing-library/react-native";
import Dashboard from "../../../../app/(app)/dashboard";
import { useDemoProfileStore } from "@/stores";

describe("Phase 5 — Dashboard (demo)", () => {
  beforeEach(() => {
    // Seed a known profile: male 80kg/180cm/30y, lose → 1,640 kcal target.
    useDemoProfileStore.getState().actions.seedFromDraft({
      goal: "lose",
      sex: "male",
      currentWeightKg: 80,
      heightCm: 180,
      ageYears: 30,
    });
  });

  it("renders the personalized target, a seeded meal item, and the streak", () => {
    const screen = render(<Dashboard />);

    expect(screen.getByText(/of 1,640 kcal/)).toBeTruthy();
    expect(screen.getByText("Greek yoghurt, 150g")).toBeTruthy();
    expect(screen.getByText(/3-day streak/)).toBeTruthy();
  });

  it("swaps to the locked free-tier view when the tier toggle is switched to Free", () => {
    const screen = render(<Dashboard />);

    // Personalized first: no lock card.
    expect(screen.queryByText("Macros & streak are Premium")).toBeNull();

    fireEvent.press(screen.getByText("Free"));

    expect(screen.getByText("Macros & streak are Premium")).toBeTruthy();
    expect(screen.getByText(/of 2,000 kcal/)).toBeTruthy();
  });

  it("adds a food via the per-meal quick-add", () => {
    const screen = render(<Dashboard />);

    // Breakfast subtotal starts at 430 (130 + 90 + 210).
    expect(screen.getByText("430 kcal")).toBeTruthy();

    fireEvent.press(screen.getAllByText("Add food")[0]);

    // Apple (95 kcal) lands in breakfast → 525.
    expect(screen.getByText("525 kcal")).toBeTruthy();
  });
});
