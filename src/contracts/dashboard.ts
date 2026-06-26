import { z } from "zod";
import { localDaySchema } from "./common";
import { dailyTotalsSchema } from "./foods";

export const dashboardCaloriesSchema = z.object({
  day: localDaySchema,
  consumedCalories: z.number(),
  targetCalories: z.number(),
  remainingCalories: z.number(),
  percentUsed: z.number(),
});
export type DashboardCalories = z.infer<typeof dashboardCaloriesSchema>;

export const dashboardCaloriesResponse = z.object({ calories: dashboardCaloriesSchema });
export type DashboardCaloriesResponse = z.infer<typeof dashboardCaloriesResponse>;

export const macroSummarySchema = z.object({
  day: localDaySchema,
  consumed: dailyTotalsSchema.pick({ proteinG: true, carbsG: true, fatG: true }),
  target: z.object({
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
});
export type MacroSummary = z.infer<typeof macroSummarySchema>;

export const dashboardMacrosResponse = z.object({ macros: macroSummarySchema });
export type DashboardMacrosResponse = z.infer<typeof dashboardMacrosResponse>;

export const streakSummarySchema = z.object({
  currentStreakDays: z.number(),
  longestStreakDays: z.number(),
  lastLoggedDay: localDaySchema.nullable(),
});
export type StreakSummary = z.infer<typeof streakSummarySchema>;

export const dashboardStreakResponse = z.object({ streak: streakSummarySchema });
export type DashboardStreakResponse = z.infer<typeof dashboardStreakResponse>;
