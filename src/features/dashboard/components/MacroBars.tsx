import { StyleSheet, View } from "react-native";
import { Text } from "@/components";
import { colors, radii, spacing } from "@/theme";
import type { MacroTargets } from "@/features/onboarding/utils/tdee";

export interface MacroTotals {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface MacroBarsProps {
  consumed: MacroTotals;
  target: MacroTargets;
}

/** Protein / carbs / fat progress bars (Figma dashboard colors). */
export function MacroBars({ consumed, target }: MacroBarsProps) {
  return (
    <View style={styles.container}>
      <MacroBar
        label="Protein"
        consumed={consumed.proteinG}
        target={target.proteinG}
        color={colors.primary}
      />
      <MacroBar
        label="Carbs"
        consumed={consumed.carbsG}
        target={target.carbsG}
        color={colors.accent}
      />
      <MacroBar label="Fat" consumed={consumed.fatG} target={target.fatG} color={colors.dark} />
    </View>
  );
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  return (
    <View style={styles.macro}>
      <View style={styles.header}>
        <Text variant="body" color="dark">
          {label}
        </Text>
        <Text variant="caption" color="muted">
          {Math.round(consumed)}/{target}g
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  macro: { gap: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.gray[200],
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radii.pill },
});
