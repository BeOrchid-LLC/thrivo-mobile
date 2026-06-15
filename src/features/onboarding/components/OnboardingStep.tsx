import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Screen, Text } from "@/components";
import { colors, radii, spacing } from "@/theme";

const TOTAL_STEPS = 8;

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar (of 8). */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned action area (Continue / Skip etc.). */
  footer: ReactNode;
}

/** Shared chrome for an onboarding step: progress bar, title/subtitle, content, footer. */
export function OnboardingStep({ step, title, subtitle, children, footer }: OnboardingStepProps) {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.segment, i < step && styles.segmentFilled]} />
          ))}
        </View>

        <View style={styles.heading}>
          <Text variant="heading2" color="dark">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.content}>{children}</View>

        <View style={styles.footer}>{footer}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.xl },
  progress: { flexDirection: "row", gap: spacing.xs },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gray[200],
  },
  segmentFilled: { backgroundColor: colors.primary },
  heading: { gap: spacing.xs },
  content: { flex: 1, gap: spacing.md },
  footer: { gap: spacing.sm },
});
