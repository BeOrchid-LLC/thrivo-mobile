import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";

// Primary swaps the green for the design-system hover/active shades; secondary and
// ghost have no green fill so they dim on press; outline is a primary-bordered
// transparent button with a dark label, the way the V2 frames draw a secondary
// action; danger is the destructive twin of secondary — a red tint under a red
// label. `active:` = pressed, `hover:` = web.
const variantClass: Record<Variant, string> = {
  primary: "bg-primary hover:bg-primaryHover active:bg-primaryActive",
  secondary: "bg-gray-100 active:opacity-[0.85]",
  ghost: "bg-transparent active:opacity-[0.85]",
  outline: "border border-primary bg-transparent active:opacity-[0.85]",
  danger: "bg-red-100 active:opacity-[0.85]",
};

const labelColorFor: Record<Variant, "inverse" | "dark" | "primary" | "error"> = {
  primary: "inverse",
  secondary: "dark",
  ghost: "primary",
  outline: "dark",
  danger: "error",
};

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Themed pressable button. 52pt tall with the 14 radius, the size every V2 frame
 * draws a button at — comfortably above the ≥44pt tap target floor (WCAG 2.2 AA,
 * MOBILE_ARCHITECTURE §7). `loading`/`disabled` block presses.
 */
export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      className={`min-h-controlLg items-center justify-center rounded-group px-lg ${variantClass[variant]} ${
        fullWidth ? "self-stretch" : ""
      } ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <View className="flex-row items-center gap-sm">
          <Text variant="body" color={labelColorFor[variant]} className="font-semibold">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
