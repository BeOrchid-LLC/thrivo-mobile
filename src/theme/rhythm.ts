/**
 * Page rhythm — the vertical spacing a screen sets on its own content.
 *
 * These were inline literals on every screen, which is why the app ran four
 * different page gaps (18, 20, 24, 26) and five different bottom paddings. The
 * 26 was almost certainly a typo for 24: no scale has an 18/20/24/26 ramp.
 *
 * They live here rather than in `spacing` because `spacing` tops out at 32 and
 * describes gaps *within* a component, not the rhythm *of a page*.
 */
export const rhythm = {
  /** The single page gap. Every screen uses this. */
  pageGap: 24,
  /** Top padding for a screen that starts with a page header. */
  pageTop: 32,
  /** Standard bottom padding. */
  pageBottom: 16,
  /** Bottom padding for a form, so the last field clears the keyboard accessory. */
  pageBottomRoomy: 40,
  /**
   * Clearance for the tab bar on a scrolling tab screen.
   *
   * Named because it is not "a lot of bottom padding" — it is the height of a
   * thing the content must not sit under. A future tab-bar change is meant to
   * find it here, not hunt for `120` across screens.
   */
  tabBarClearance: 120,
};

export type Rhythm = typeof rhythm;
