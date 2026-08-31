/**
 * Control, badge and icon dimensions.
 *
 * These used to be arbitrary values (`h-[48px]`, `min-h-[44px]`, …) because
 * `spacing` stops at 32, so there was nowhere for them to live. That left the
 * app using **both 44 and 48 as "the" minimum touch target**, in different
 * files, with nothing saying which was correct.
 *
 * `touchTarget` settles it at 48: Android's minimum, and comfortably above
 * Apple's 44pt floor, so one number satisfies both stores. Anything a finger
 * touches uses it — reaching for a raw number is the bug this exists to stop.
 *
 * Names describe the **role**, not the pixel count. `control` and `badge` are
 * both 48 today and are deliberately separate: a control height and a circular
 * icon badge are not the same decision, and one may move without the other.
 */
export const sizing = {
  /** Minimum hit area for anything tappable. Android min, above Apple's 44pt. */
  touchTarget: 48,

  /** Standard control height — buttons, inputs, selects, time fields.
   *  56 on every V2 frame (Figma: PrimaryBtn and InputBox are both h-56). */
  control: 56,
  /** Taller control — radio rows, segmented rows. */
  controlLg: 52,
  /** Two-line control — a stacked value + unit tile (water quick add). */
  controlXl: 64,

  /** Circular icon badge. */
  badge: 48,
  /** Larger circular icon badge. */
  badgeLg: 52,
  /** Profile avatar. */
  avatar: 64,

  /** Decorative icon tile inside a card — not itself a tap target. */
  tile: 44,
  /** Mood-scale option circle on the dashboard check-in row (Figma 371:399: 60). */
  moodTile: 60,

  /** Fixed label column of a labelled progress row, so every bar starts on one x. */
  labelColumn: 72,
  /** Right-aligned numeric readout beside a progress bar ("110/200g"). */
  readoutColumn: 80,

  /** Icon boxes. `icon` is the default. */
  iconSm: 22,
  icon: 24,
  iconMd: 36,
};

export type Sizing = typeof sizing;
