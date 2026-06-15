import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components";
import { colors, radii, spacing } from "@/theme";

interface SelectCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Single-select option card (Figma "Cards" component). Selected state uses the
 * brand-green border + a check, matching the design guide. Tokens only.
 */
export function SelectCard({ label, description, selected, onPress }: SelectCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.text}>
        <Text variant="heading3" color="dark">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Text style={styles.check}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 72,
  },
  cardSelected: { borderColor: colors.primary },
  text: { flex: 1, gap: spacing.xs },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  check: { color: colors.white, fontSize: 14, lineHeight: 16, fontWeight: "700" },
});
