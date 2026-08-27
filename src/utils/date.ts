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

/**
 * "July 18, 2026" — how the subscription surfaces state a billing date. Renewal
 * and access-end dates are decisions about money, so they spell the month out
 * rather than risk an ambiguous numeric format.
 */
export function formatLongDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * "Jul. 16" — the compact form for a date sitting inside a row of copy. The full
 * stop is the abbreviation's, so it is dropped for the one month `Intl` does not
 * abbreviate: May.
 */
export function formatShortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const short = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const long = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  return `${short}${short === long ? "" : "."} ${date.getDate()}`;
}
