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
      style={(state) => {
        // `hovered` is provided by react-native-web; absent (undefined) on native.
        const { pressed } = state;
        const hovered = (state as { hovered?: boolean }).hovered;
        const isPrimary = variant === "primary";
        return [
          styles.base,
          containerFor[variant],
          fullWidth && styles.fullWidth,
          // Primary swaps the green for the design-system hover/active shades;
          // secondary/ghost have no green fill, so they use the opacity dim.
          isPrimary && hovered ? { backgroundColor: colors.primaryHover } : null,
          isPrimary && pressed ? { backgroundColor: colors.primaryActive } : null,
          !isPrimary && pressed ? styles.pressed : null,
          isDisabled && styles.disabled,
          style,
        ];
      }}
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
