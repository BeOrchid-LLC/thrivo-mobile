import { z } from "zod";
import { localDaySchema } from "./common";
import { dailyTotalsSchema } from "./foods";

/**
 * Dashboard payload. Free users see calories vs a 2,000 default; premium users
 * get macros, personalized target and streak (entitlement enforced server-side).
 */
export const dashboardSchema = z.object({
  day: localDaySchema,
  consumed: dailyTotalsSchema,
  targetCalories: z.number(),
  /** Premium-only fields are null for free users. */
  targetProteinG: z.number().nullable(),
  targetCarbsG: z.number().nullable(),
  targetFatG: z.number().nullable(),
  streakDays: z.number().nullable(),
  latestWeightKg: z.number().nullable(),
  waterMl: z.number().nullable(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

export const dashboardResponse = z.object({ dashboard: dashboardSchema });
export type DashboardResponse = z.infer<typeof dashboardResponse>;
