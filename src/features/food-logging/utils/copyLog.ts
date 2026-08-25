import { MEAL_TIME_WINDOWS } from "@/contracts";
import type { FoodLogEntry, LogFoodPayload, MealTime } from "@/contracts";

/** Display/copy order — the same order the history meal-time filter offers. */
export const MEAL_TIME_ORDER: readonly MealTime[] = ["morning", "afternoon", "evening", "night"];

/**
 * Which meal bucket an hour falls into, derived from the shared
 * `MEAL_TIME_WINDOWS` constant so the app never disagrees with the server's SQL
 * predicate. "night" wraps midnight (startHour > endHour); `endHour` is
 * exclusive.
 */
export function mealTimeForHour(hour: number): MealTime {
  for (const mealTime of MEAL_TIME_ORDER) {
    const { startHour, endHour } = MEAL_TIME_WINDOWS[mealTime];
    const wraps = startHour > endHour;
    const inWindow = wraps
      ? hour >= startHour || hour < endHour
      : hour >= startHour && hour < endHour;
    if (inWindow) return mealTime;
  }
  // The four windows cover all 24 hours, so this is unreachable for a valid hour.
  return "night";
}

/** Local hour, matching how the backend buckets in the user's timezone. */
export function mealTimeForEntry(entry: FoodLogEntry): MealTime {
  return mealTimeForHour(new Date(entry.consumedAt).getHours());
}

export interface MealGroup {
  mealTime: MealTime;
  entries: FoodLogEntry[];
  calories: number;
}

/** Non-empty meal buckets for a day, in morning → night order. */
export function groupEntriesByMealTime(entries: readonly FoodLogEntry[]): MealGroup[] {
  const byMealTime = new Map<MealTime, FoodLogEntry[]>();
  for (const entry of entries) {
    const mealTime = mealTimeForEntry(entry);
    const group = byMealTime.get(mealTime);
    if (group) group.push(entry);
    else byMealTime.set(mealTime, [entry]);
  }

  return MEAL_TIME_ORDER.flatMap((mealTime) => {
    const grouped = byMealTime.get(mealTime);
    if (!grouped || grouped.length === 0) return [];
    return [{ mealTime, entries: grouped, calories: totalCalories(grouped) }];
  });
}

export function totalCalories(entries: readonly FoodLogEntry[]): number {
  return Math.round(entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0));
}

/**
 * Only catalog-backed entries can be re-logged: `POST /foods/log` takes a
 * `foodItemId` (or a full external snapshot, which a stored entry does not
 * carry). Described-meal estimates have no `foodItemId`, so they are skipped
 * rather than silently logged as something they aren't.
 */
export function isCopyable(entry: FoodLogEntry): boolean {
  return Boolean(entry.foodItemId);
}

/**
 * The source entry's time of day, moved onto the target day, so a copied
 * breakfast stays a breakfast. Returns `undefined` for an unparseable
 * timestamp — the copy still lands, timed by the server instead.
 */
export function consumedAtOnDay(sourceConsumedAt: string, targetDay: string): string | undefined {
  const source = new Date(sourceConsumedAt);
  const [year, month, date] = targetDay.split("-").map(Number);
  if (Number.isNaN(source.getTime()) || !year || !month || !date) return undefined;
  return new Date(
    year,
    month - 1,
    date,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    0
  ).toISOString();
}

export interface CopyPlan {
  payloads: LogFoodPayload[];
  /** Entries that cannot be re-logged (no catalog link) — reported, not hidden. */
  skipped: number;
  /** Calories the copyable entries will add to the target day. */
  calories: number;
}

/** What copying `entries` onto `targetDay` would send, and what it cannot send. */
export function buildCopyPlan(entries: readonly FoodLogEntry[], targetDay: string): CopyPlan {
  const copyable = entries.filter(isCopyable);
  return {
    payloads: copyable.map((entry) => ({
      // `isCopyable` guarantees the id.
      foodItemId: entry.foodItemId as string,
      day: targetDay,
      servings: entry.servings,
      servingId: entry.servingId ?? undefined,
      servingUnit: entry.servingUnit ?? undefined,
      consumedAt: consumedAtOnDay(entry.consumedAt, targetDay),
    })),
    skipped: entries.length - copyable.length,
    calories: totalCalories(copyable),
  };
}
