/**
 * Dashboard feature flags.
 *
 * Parked switches live here rather than being deleted, so turning a surface back
 * on is a one-line change and the code behind it keeps being type-checked and
 * tested instead of rotting on a branch.
 */

/**
 * Whether the dashboard macro card is behind the premium gate.
 *
 * On: nutrition macros are a paid feature, alongside progress charts beyond 14
 * days and food/water history beyond 7. This was parked off while the Figma
 * dashboard frames showed macros populated for every user; those frames predate
 * the decision to gate them.
 *
 * Typed `boolean`, not a literal, so both branches stay reachable to TypeScript
 * and neither gets flagged as dead code whichever way the flag is set.
 */
export const DASHBOARD_MACROS_GATED: boolean = true;
