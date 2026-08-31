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
 * Off for now: the Figma dashboard frames show macros populated for every user,
 * and the "Subscribe to see your macros" card is not in them. The `PremiumGate`
 * branch in `MacrosSection` — and the entitlement check that feeds it — stay
 * intact; flip this back to `true` to restore the gate.
 *
 * Typed `boolean`, not the literal `false`, so the gated branches stay reachable
 * to TypeScript and do not get flagged as dead code while the flag is off.
 */
export const DASHBOARD_MACROS_GATED: boolean = false;
