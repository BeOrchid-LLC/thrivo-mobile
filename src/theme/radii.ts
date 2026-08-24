/**
 * Corner radii.
 *
 * `sm`–`xl` are the base ramp. The four named steps below are radii the Figma
 * screens genuinely use that the ramp was missing — they were being written
 * inline as `rounded-[14px]` and friends, which is how a scale quietly stops
 * being a scale.
 *
 * They are named by **role** rather than slotted into the t-shirt ramp on
 * purpose: inserting 12 and 14 between `md` and `lg` would have renumbered `lg`
 * and `xl`, silently reshaping the 22 surfaces already using them. Naming the
 * role also says which one to reach for, which a number never does.
 */
export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,

  /** Inset chip inside a control — the active segment of `Segmented`. */
  chip: 8,
  /** Small square tile — icon holders, `InsightPill`. */
  tile: 12,
  /** Grouped/bordered list container — `RadioGroup`, sheet lists, time rows. */
  group: 14,
  /** Large bordered panel — the onboarding feature panel. */
  panel: 20,
};

export type Radii = typeof radii;
