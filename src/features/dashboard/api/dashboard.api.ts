import { callApi } from "@/api";
import { localDay } from "@/utils";
import type { FoodLogHistoryResponse } from "@/contracts";

export const getDashboardCalories = async (day = localDay()) =>
  (await callApi("DASHBOARD_CALORIES", { query: { date: day } })).calories;

export const getDashboardMacros = async (day = localDay()) =>
  (await callApi("DASHBOARD_MACROS", { query: { date: day } })).macros;

export const getDashboardStreak = async () => (await callApi("DASHBOARD_STREAK")).streak;

export const getDashboardWater = async (day = localDay()) =>
  (await callApi("WATER_GET", { query: { date: day } })).water;

export const getMealLogDay = async (day = localDay()) =>
  await callApi("FOOD_LOG_DAY", { query: { date: day } });

export const getFoodLogHistory = async (): Promise<FoodLogHistoryResponse> =>
  await callApi("FOOD_LOG_HISTORY");

/** Add a serving of water (ml) for today. */
export const addWater = (amountMl: number) =>
  callApi("WATER_ADD", { payload: { day: localDay(), amountMl } });
