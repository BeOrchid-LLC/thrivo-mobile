import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { colors } from "@/theme";
import type { Typography } from "@/theme/typography";

type Variant = keyof Typography;
/**
 * Semantic text colours.
 *
 * `muted` (gray 600) and `subtle` (the lighter neutral) are deliberately
 * different. `subtle` used to be called `mutedText`, which read as a synonym for
 * `muted` while resolving to a different colour — and a third name, `gray600`,
 * was an exact duplicate of `muted` (both gray 600). Any of the three was a coin
 * flip at the call site; two of them are now gone.
 */
export type TextColor =
  | "primary"
  | "primaryDeep"
  | "dark"
  | "muted"
  | "subtle"
  | "gray500"
  | "inverse"
  | "light"
  | "light70"
  | "accent"
  | "accentText"
  | "warning"
  | "warningText"
  | "error"
  | "success"
  | "successBright"
  | "targetGreen"
  | "tdeeNumber"
  | "tdeeValue"
  | "tdeeLabel";

// Variant carries size + line height (text-*) and the Inter family weight
// (font-*); both come from the tailwind theme, which is sourced from src/theme.
const variantClass: Record<Variant, string> = {
  hero: "text-hero font-semibold",
  heading1: "text-heading1 font-semibold",
  heading2: "text-heading2 font-semibold",
  heading3: "text-heading3 font-semibold",
  pageTitle: "text-pageTitle font-bold",
  title: "text-title font-semibold",
  metric: "text-metric font-semibold",
  otp: "text-otp font-semibold",
  "body-lg": "text-body-lg font-regular",
  body: "text-body font-regular",
  "body-sm": "text-body-sm font-regular",
  label: "text-label font-regular",
  caption: "text-caption font-semibold",
  micro: "text-micro font-regular",
};

const colorValue: Record<TextColor, string> = {
  primary: colors.primary,
  primaryDeep: colors.primaryDeep,
  dark: colors.dark,
  muted: colors.gray[600],
  subtle: colors.muted,
  gray500: colors.gray[500],
  inverse: colors.white,
  light: colors.light,
  light70: "rgba(244, 246, 249, 0.7)",
  accent: colors.accent,
  accentText: colors.accentText,
  warning: colors.warning,
  warningText: colors.warningText,
  error: colors.error,
  success: colors.success,
  successBright: colors.successBright,
  targetGreen: colors.targetGreen,
  tdeeNumber: colors.tdeeNumber,
  tdeeValue: colors.tdeeValue,
  tdeeLabel: colors.tdeeLabel,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: TextColor;
}

/**
 * Themed text primitive. All typography flows through the theme ramp; callers
 * pick a `variant` + semantic `color` token rather than raw font sizes/hex.
 */
export function Text({ variant = "body", color = "dark", className, style, ...rest }: TextProps) {
  return (
    <RNText
      className={`${variantClass[variant]} ${className ?? ""}`}
      style={[{ color: colorValue[color] }, style]}
      {...rest}
    />
  );
}
