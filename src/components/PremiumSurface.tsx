import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "@/theme";

const styles = StyleSheet.create({
  /** Glass top edge — catches the light like a real raised surface would. */
  topHighlight: {
    height: StyleSheet.hairlineWidth * 2,
  },
  /** Floating elevation. Same shape as the dashboard card shadow, deepened. */
  raised: {
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
});

export interface PremiumSurfaceProps {
  children: ReactNode;
  /** Adds a floating shadow. Off for surfaces that sit in the page flow. */
  raised?: boolean;
  className?: string;
  contentStyle?: ViewStyle;
}

/**
 * The app's premium surface: dark→bright-green diagonal gradient, a primary
 * border, a diagonal sheen and a glass top edge.
 *
 * Extracted because this treatment now carries every "this is the paid tier"
 * moment — the trial card in onboarding, the in-context upgrade gate, and the
 * paywall hero. Three hand-rolled copies would drift, and the whole point of the
 * treatment is that a user recognises it as the same thing each time.
 */
export function PremiumSurface({
  children,
  raised = false,
  className,
  contentStyle,
}: PremiumSurfaceProps) {
  return (
    <View
      className={`overflow-hidden rounded-panel border-[1.333px] border-primary ${className ?? ""}`}
      style={raised ? styles.raised : undefined}
    >
      <LinearGradient
        colors={[colors.dark, colors.gradientMid, colors.primaryBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={contentStyle ?? { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl }}
      >
        {/* Sheen across the top-left, where a raised surface would catch the
            light. Above the gradient, below the content. */}
        <LinearGradient
          pointerEvents="none"
          colors={[colors.sheen, colors.sheenFade]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          className="absolute left-0 right-0 top-0 bg-white/[0.28]"
          style={styles.topHighlight}
        />
        {children}
      </LinearGradient>
    </View>
  );
}
