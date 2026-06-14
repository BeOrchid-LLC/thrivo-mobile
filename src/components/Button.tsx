import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const containerFor: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.gray[100] },
  ghost: { backgroundColor: "transparent" },
};

const labelColorFor: Record<Variant, "inverse" | "dark" | "primary"> = {
  primary: "inverse",
  secondary: "dark",
  ghost: "primary",
};

/**
 * Themed pressable button. Min height 48 keeps tap targets ≥44pt (WCAG 2.2 AA,
 * MOBILE_ARCHITECTURE §7). `loading`/`disabled` block presses.
 */
export function Button({
  label,
  variant = "primary",
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        containerFor[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <View style={styles.content}>
          <Text variant="body" color={labelColorFor[variant]} style={styles.label}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontWeight: "600" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
