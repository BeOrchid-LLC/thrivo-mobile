import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { colors, typography } from "@/theme";

type Variant = keyof typeof typography;
type ColorToken = "primary" | "dark" | "muted" | "inverse" | "error" | "success";

const colorFor: Record<ColorToken, string> = {
  primary: colors.primary,
  dark: colors.dark,
  muted: colors.gray[600],
  inverse: colors.white,
  error: colors.error,
  success: colors.success,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorToken;
}

/**
 * Themed text primitive. All typography flows through the `theme` ramp; callers
 * pick a `variant` + semantic `color` token rather than raw font sizes/hex.
 */
export function Text({ variant = "body", color = "dark", style, ...rest }: TextProps) {
  const base: TextStyle = { ...typography[variant], color: colorFor[color] };
  return <RNText style={[base, style]} {...rest} />;
}
