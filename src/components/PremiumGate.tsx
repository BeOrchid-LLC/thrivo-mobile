import { BlurView } from "expo-blur";
import { CaretRight, CrownSimple } from "phosphor-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { analytics } from "@/lib";
import { colors, spacing } from "@/theme";
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
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
});

/**
 * Blurred premium content with the in-context upgrade prompt.
 *
 * **One shape everywhere: a frosted bar pinned to the bottom of the gated area.**
 *
 * This used to be a centred card. That worked on the dashboard, where the gated
 * macro card is tall, and failed everywhere else: the log and edit sheets gate a
 * ~96px macro row, so the card was squashed into an unreadable green smear with
 * its title, subtitle and button all clipped away. A prompt whose legibility
 * depends on how tall the thing behind it happens to be is the wrong prompt.
 *
 * The bar is short enough to sit over anything, and the whole bar is the control
 * — which is what keeps it compact without dropping the hit area below the 48pt
 * floor that a small inline button would have.
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

  // Measured rather than guessed: the bar's height depends on how far the title
  // and subtitle wrap, which varies per call site.
  const [barHeight, setBarHeight] = useState(0);

  return (
    // The real content renders in normal flow behind the glass, at its own
    // natural size, so the teaser looks like the feature rather than a stretched
    // approximation of it. The wrapper then grows to whichever is taller —
    // content or bar — because `overflow-hidden` would otherwise clip the
    // prompt wherever the gated content is short.
    <View
      className="overflow-hidden rounded-lg"
      style={barHeight > 0 ? { minHeight: barHeight + spacing.md * 2 } : undefined}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}. View plans`}
            onPress={onViewPlans}
            onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
            className="w-full overflow-hidden rounded-panel border border-white/[0.35]"
            style={styles.raised}
          >
            <BlurView
              tint="dark"
              intensity={40}
              experimentalBlurMethod={ANDROID_BLUR_METHOD}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Scrim: the blur alone takes on whatever sits behind it, so light
                text would fail contrast over a pale macro card. */}
            <View className="flex-row items-center gap-sm bg-dark/[0.42] px-md py-sm">
              <View className="h-iconMd w-iconMd items-center justify-center rounded-pill bg-accent/[0.18]">
                <CrownSimple size={18} color={colors.accent} weight="fill" />
              </View>
              <View className="flex-1">
                <Text variant="caption" color="light" className="font-semibold">
                  {title}
                </Text>
                <Text variant="micro" color="light70">
                  {subtitle}
                </Text>
              </View>
              <CaretRight size={16} color={colors.white} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
