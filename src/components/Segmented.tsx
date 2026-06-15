import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme";
import { Text } from "./Text";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  /** `undefined` renders with no segment selected (e.g. an unanswered choice). */
  value: T | undefined;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * Compact segmented control (single-select). Used for unit (kg/lb), sex, and the
 * dashboard tier toggle. Tokens only; the active segment fills with the brand green.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text variant="caption" color={active ? "inverse" : "dark"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.gray[100],
    borderRadius: radii.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
});
