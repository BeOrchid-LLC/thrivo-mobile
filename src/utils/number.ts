/**
 * Number formatting for display.
 *
 * `Number.prototype.toLocaleString()` with no argument follows the *device*
 * locale, so the same build renders "1,800" on one phone and "1 800" (with a
 * narrow no-break space) on another. The app ships one language and the Figma
 * frames group with commas, so grouping is a product decision, not a device
 * one — this pins it.
 *
 * Grouping is done by regex rather than `Intl.NumberFormat` because this runs
 * on every frame of a count-up animation, where constructing a formatter per
 * call is measurable, and because it needs no ICU locale data on Hermes.
 */
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/** Matches `toLocaleString()`'s default of at most three fraction digits. */
const FRACTION_SCALE = 1000;

/** Formats a number for display: comma-grouped, at most three decimals. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * FRACTION_SCALE) / FRACTION_SCALE;
  const [whole, fraction] = Math.abs(rounded).toString().split(".");
  const sign = rounded < 0 ? "-" : "";
  const grouped = whole.replace(THOUSANDS, ",");
  return fraction ? `${sign}${grouped}.${fraction}` : `${sign}${grouped}`;
}
