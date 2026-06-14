/**
 * Local-day helpers. The app keys logs/dashboard by the user's local calendar
 * day (`YYYY-MM-DD`), not UTC — so a late-night entry lands on the right day.
 */
export function localDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Shift a `YYYY-MM-DD` string by `delta` days (local), returning the same format. */
export function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const d = new Date(year, month - 1, date);
  d.setDate(d.getDate() + delta);
  return localDay(d);
}

export const isToday = (day: string): boolean => day === localDay();
