import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { colors, sizing } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "default" | "compact";

const sizeClass: Record<Size, string> = {
  default: "min-h-control rounded-lg px-lg",
  compact: "min-h-controlSm rounded-chip px-md",
};

/** Restores the touch-target floor `compact`'s drawn height sits below. */
const COMPACT_HIT_SLOP = (sizing.touchTarget - sizing.controlSm) / 2;

// Primary swaps the green for the design-system hover/active shades; secondary and
// ghost have no green fill so they dim on press; outline is a primary-bordered
// transparent button with a dark label, the way the V2 frames draw a secondary
// action; danger is the destructive twin of secondary — a red tint under a red
// label. `active:` = pressed, `hover:` = web.
const variantClass: Record<Variant, string> = {
  primary: "bg-primaryDeep hover:bg-primaryDeepHover active:bg-primaryDeepActive",
  secondary: "bg-gray-100 active:opacity-[0.85]",
  ghost: "bg-transparent active:opacity-[0.85]",
  outline: "border border-primary bg-transparent active:opacity-[0.85]",
  danger: "bg-red-100 active:opacity-[0.85]",
};

const labelColorFor: Record<Variant, "inverse" | "dark" | "primaryDeep" | "error"> = {
  primary: "inverse",
  secondary: "dark",
  ghost: "primaryDeep",
  outline: "dark",
  danger: "error",
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  /**
   * `default` is the 56pt frame button. `compact` is the same button shrunk to
   * label height for the places a filled action sits inline with body copy —
   * beside a field label, say — where 56 would tower over the row. It carries
   * `hitSlop` so the smaller pill still clears the 48pt tap target.
   */
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Themed pressable button. 56pt tall with the 16 radius, the size every V2 frame
 * draws a button at — comfortably above the ≥44pt tap target floor (WCAG 2.2 AA,
 * MOBILE_ARCHITECTURE §7). `loading`/`disabled` block presses.
 */
export function Button({
  label,
  variant = "primary",
  size = "default",
  loading = false,
  fullWidth = true,
  disabled,
  className,
  hitSlop,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      hitSlop={hitSlop ?? (size === "compact" ? COMPACT_HIT_SLOP : undefined)}
      className={`items-center justify-center ${sizeClass[size]} ${variantClass[variant]} ${
        fullWidth ? "self-stretch" : ""
      } ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primaryDeep} />
      ) : (
        <View className="flex-row items-center gap-sm">
          <Text
            variant={size === "compact" ? "caption" : "body"}
            color={labelColorFor[variant]}
            className="font-semibold"
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
