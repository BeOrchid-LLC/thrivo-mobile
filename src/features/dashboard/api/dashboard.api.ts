import { callApi } from "@/api";
import { localDay } from "@/utils";
import type { FoodLogEntry } from "@/contracts";

/** Today's aggregated dashboard payload (totals, targets, streak, water). */
export const getDashboard = async () => (await callApi("GET_DASHBOARD")).dashboard;

/** Today's food-log entries (history filtered to the local day). */
export const getTodayFoodLog = async (): Promise<FoodLogEntry[]> => {
  const { entries } = await callApi("FOOD_LOG_HISTORY");
  const today = localDay();
  return entries.filter((entry) => entry.day === today);
};

/** Add a serving of water (ml) for today. */
export const addWater = (amountMl: number) =>
  callApi("WATER_ADD", { payload: { day: localDay(), amountMl } });
