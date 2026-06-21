import { Text as RNText, type TextProps as RNTextProps } from "react-native";

type Variant = "heading1" | "heading2" | "heading3" | "body" | "caption";
type ColorToken = "primary" | "dark" | "muted" | "inverse" | "error" | "success";

// Variant carries size + line height (text-*) and the Inter family weight
// (font-*); both come from the tailwind theme, which is sourced from src/theme.
const variantClass: Record<Variant, string> = {
  heading1: "text-heading1 font-semibold",
  heading2: "text-heading2 font-semibold",
  heading3: "text-heading3 font-semibold",
  body: "text-body font-regular",
  caption: "text-caption font-semibold",
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
