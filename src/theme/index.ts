import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { radii } from "./radii";

export { colors } from "./colors";
export { spacing } from "./spacing";
export { typography } from "./typography";
export { radii } from "./radii";

export type { Colors } from "./colors";
export type { Spacing } from "./spacing";
export type { Typography } from "./typography";
export type { Radii } from "./radii";

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
} as const;

export type Theme = typeof theme;
