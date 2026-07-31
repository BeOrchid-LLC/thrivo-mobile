import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import type { Typography } from "@/theme/typography";

type Variant = keyof Typography;
type ColorToken = "primary" | "dark" | "muted" | "inverse" | "error" | "success";

// Variant carries size + line height (text-*) and the Inter family weight
// (font-*); both come from the tailwind theme, which is sourced from src/theme.
const variantClass: Record<Variant, string> = {
  hero: "text-hero font-semibold",
  heading1: "text-heading1 font-semibold",
  heading2: "text-heading2 font-semibold",
  heading3: "text-heading3 font-semibold",
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

const colorClass: Record<ColorToken, string> = {
  primary: "text-primary",
  dark: "text-dark",
  muted: "text-gray-600",
  inverse: "text-white",
  error: "text-error",
  success: "text-success",
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorToken;
}

/**
 * Themed text primitive. All typography flows through the theme ramp; callers
 * pick a `variant` + semantic `color` token rather than raw font sizes/hex.
 */
export function Text({ variant = "body", color = "dark", className, style, ...rest }: TextProps) {
  return (
    <RNText
      className={`${variantClass[variant]} ${colorClass[color]} ${className ?? ""}`}
      style={style}
      {...rest}
    />
  );
}
