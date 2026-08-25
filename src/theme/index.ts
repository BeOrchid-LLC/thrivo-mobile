import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { radii } from "./radii";
import { sizing } from "./sizing";
import { rhythm } from "./rhythm";

export { colors } from "./colors";
export { spacing } from "./spacing";
export { typography } from "./typography";
export { radii } from "./radii";
export { sizing } from "./sizing";
export { rhythm } from "./rhythm";

export type { Colors } from "./colors";
export type { Spacing } from "./spacing";
export type { Typography } from "./typography";
export type { Radii } from "./radii";
export type { Sizing } from "./sizing";
export type { Rhythm } from "./rhythm";

/**
 * The single aggregated design-token object. Components consume tokens through
 * `theme.colors.primary`, `theme.spacing.md`, etc. — never hardcoded values
 * (MOBILE_ARCHITECTURE §7). Structured so a dark theme is additive later.
 */
export const theme = {
  colors,
  spacing,
  typography,
  radii,
  sizing,
  rhythm,
} as const;

export type Theme = typeof theme;
