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

/**
 * The device's IANA timezone, e.g. "Europe/London".
 *
 * The backend schedules reminders from this, so a stale value delivers them at
 * the wrong local time. Falls back to UTC only if the platform cannot resolve
 * one, which is better than sending nothing and leaving the column null.
 */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
