import {
  bmrMifflinStJeor,
  goalAdjustmentKcal,
  calorieTarget,
  deriveMacroTargets,
  ACTIVITY_FACTORS,
} from "../tdee";

describe("Phase 3 — TDEE (Mifflin-St Jeor)", () => {
  describe("bmrMifflinStJeor", () => {
    it("computes male BMR with the +5 constant", () => {
      // 10·80 + 6.25·180 − 5·30 + 5 = 1780
      expect(bmrMifflinStJeor({ sex: "male", weightKg: 80, heightCm: 180, ageYears: 30 })).toBe(
        1780
      );
    });

    it("computes female BMR with the −161 constant", () => {
      // 10·65 + 6.25·165 − 5·30 − 161 = 1370.25
      expect(bmrMifflinStJeor({ sex: "female", weightKg: 65, heightCm: 165, ageYears: 30 })).toBe(
        1370.25
      );
    });
  });

  describe("goalAdjustmentKcal", () => {
    it("applies a deficit for lose, surplus for gain, zero for maintain", () => {
      expect(goalAdjustmentKcal("lose")).toBe(-500);
      expect(goalAdjustmentKcal("gain")).toBe(300);
      expect(goalAdjustmentKcal("maintain")).toBe(0);
    });
  });

  describe("calorieTarget", () => {
    it("defaults to the sedentary factor and rounds the final target to 10 kcal", () => {
      const b = calorieTarget({
        sex: "male",
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        goal: "lose",
      });
      expect(b.bmr).toBe(1780);
      expect(b.activity).toBe("sedentary");
      expect(b.activityFactor).toBe(ACTIVITY_FACTORS.sedentary);
      expect(b.maintenanceKcal).toBe(2136); // round(1780 × 1.2)
      expect(b.goalAdjustmentKcal).toBe(-500);
      expect(b.dailyTargetKcal).toBe(1640); // round10(2136 − 500 = 1636)
    });

    it("honours an explicit activity level", () => {
      const b = calorieTarget({
        sex: "female",
        weightKg: 65,
        heightCm: 165,
        ageYears: 30,
        goal: "maintain",
        activity: "moderate",
      });
      expect(b.bmr).toBe(1370); // round(1370.25)
      expect(b.activityFactor).toBe(ACTIVITY_FACTORS.moderate);
      expect(b.maintenanceKcal).toBe(2124); // round(1370 × 1.55 = 2123.5)
      expect(b.dailyTargetKcal).toBe(2120); // round10(2124 + 0)
    });
  });

  describe("deriveMacroTargets", () => {
    it("splits kcal 30/40/30 into grams at 4/4/9 kcal per gram", () => {
      expect(deriveMacroTargets(2000)).toEqual({ proteinG: 150, carbsG: 200, fatG: 67 });
    });
  });
});
