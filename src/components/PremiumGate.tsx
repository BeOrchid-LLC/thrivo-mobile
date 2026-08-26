import { BlurView } from "expo-blur";
import { Lock } from "phosphor-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { analytics } from "@/lib";
import { colors, spacing } from "@/theme";
import { Button } from "./Button";
import { Text } from "./Text";

export interface PremiumGateProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  onViewPlans: () => void;
}

const styles = StyleSheet.create({
  raised: {
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
});

/**
 * Blurred premium content with the in-context upgrade prompt.
 *
 * **One shape everywhere: a centred light card over the blurred area** — lock
 * glyph, title, reassurance line, then the primary "View plans" action.
 *
 * The card is measured, not assumed: the wrapper takes a `minHeight` from the
 * card's own laid-out height so short gated regions (the ~96px macro row in the
 * log and edit sheets) grow to fit the prompt instead of clipping it. That
 * measurement is the whole reason one card can sit over both a tall history
 * list and a single macro row without a per-call-site variant.
 */
// expo-blur defaults `experimentalBlurMethod` to "none" on Android, which
// renders as a flat semi-transparent tint instead of a blur — iOS always gets
// a real blur via UIVisualEffectView, so this was invisible until someone
// actually ran the app on Android. "dimezisBlurView" is a no-op on iOS/web.
const ANDROID_BLUR_METHOD = "dimezisBlurView" as const;

export function PremiumGate({ children, title, subtitle, onViewPlans }: PremiumGateProps) {
  // Every in-context upgrade prompt is a funnel impression — this is the
  // `upgrade_prompt_shown` step the PRD tracks, distinct from a paywall view.
  useEffect(() => {
    analytics.track("thrivo.upgrade_prompt_shown", { title });
  }, [title]);

  const [cardHeight, setCardHeight] = useState(0);

  return (
    // The real content renders in normal flow behind the glass, at its own
    // natural size, so the teaser looks like the feature rather than a stretched
    // approximation of it. The wrapper then grows to whichever is taller —
    // content or card — because `overflow-hidden` would otherwise clip the
    // prompt wherever the gated content is short.
    <View
      className="overflow-hidden rounded-lg"
      style={cardHeight > 0 ? { minHeight: cardHeight + spacing.md * 2 } : undefined}
    >
      {children}

      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <BlurView
          pointerEvents="none"
          tint="light"
          intensity={30}
          experimentalBlurMethod={ANDROID_BLUR_METHOD}
          style={StyleSheet.absoluteFillObject}
        />

        <View pointerEvents="box-none" className="absolute inset-0 justify-end p-md">
          <View
            accessible={false}
            onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
            className="w-full items-center gap-xs rounded-panel bg-light px-lg py-lg"
            style={styles.raised}
          >
            <Lock size={24} color={colors.gray[600]} />
            <Text variant="body" color="dark" className="text-center font-bold">
              {title}
            </Text>
            <Text variant="caption" color="muted" className="mb-sm text-center">
              {subtitle}
            </Text>
            <Button
              label="View plans"
              accessibilityLabel={`${title}. View plans`}
              onPress={onViewPlans}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
