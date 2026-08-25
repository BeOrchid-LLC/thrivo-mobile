import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeftIcon, PageHeader, Text } from "@/components";
import { colors, spacing } from "@/theme";
import { TOTAL_ONBOARDING_STEPS } from "../config";

/**
 * Figma-exact metrics for the onboarding frames (393pt wide). Literals for the
 * same reason the auth shell uses them: the scale has no 20, 25 or 33.
 */
const PAGE_PADDING_X = 20;
const PAGE_PADDING_BOTTOM = 40;
const BACK_SIZE = 24;
// The frame draws no status bar, so its title sits ~7pt above where a real
// safe-area inset puts ours; this gap absorbs that so the progress bar and
// everything under it land on the frame's positions.
const TITLE_TO_PROGRESS = 13;
const PROGRESS_HEIGHT = 4;
const PROGRESS_TO_QUESTION = 32;
const QUESTION_TO_SUBTITLE = 9;
const SUBTITLE_TO_CONTENT = 33;
const CONTENT_GAP = 16;
const CONTENT_TO_FOOTER = 45;
const FOOTER_GAP = 24;

/** Header shown above every onboarding step; the question below it is per-step. */
const SECTION_TITLE = "Get settled in";

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar. Hidden in settings variant. */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Action area (Continue / Skip etc.). */
  footer: ReactNode;
  /** Override the back button behavior (defaults to router.back). */
  onBack?: () => void;
  /**
   * "onboarding" (default): gradient page, section header, progress bar.
   * "settings": plain white background, no progress bar — looks like a settings
   * screen, because the same step components are re-used from the Settings hub.
   */
  variant?: "onboarding" | "settings";
}

/** Circular back affordance from the frames. Hidden when there is nowhere to go. */
function BackCircle({ onPress }: { onPress?: () => void }) {
  const canGoBack = onPress !== undefined || router.canGoBack();
  if (!canGoBack) return <View style={{ width: BACK_SIZE, height: BACK_SIZE }} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={onPress ?? (() => router.back())}
      style={{ width: BACK_SIZE, height: BACK_SIZE }}
      className="items-center justify-center rounded-pill border border-hairline active:opacity-[0.6]"
    >
      <ChevronLeftIcon size={14} />
    </Pressable>
  );
}

/**
 * Shared chrome for an onboarding step (Figma "Onboarding S2"): the light →
 * soft-green page gradient, a centred section title with the back circle beside
 * it, the progress track, the step's question and subtitle, the step content,
 * and the actions below it.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  footer,
  onBack,
  variant = "onboarding",
}: OnboardingStepProps) {
  if (variant === "settings") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.xl,
              paddingBottom: spacing.md,
            }}
          >
            <PageHeader title={title} subtitle={subtitle} onBack={onBack} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 gap-md">{children}</View>
          </ScrollView>

          {/* Pinned action area, `spacing.lg` (16) below — the same distance
              from the bottom as `Screen`'s footer on every other page. */}
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.sm,
              paddingBottom: spacing.lg,
            }}
            className="gap-sm"
          >
            {footer}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    // Same gradient pairing as the auth screens, so the pre-app surfaces read as
    // one set.
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: PAGE_PADDING_X,
            paddingBottom: PAGE_PADDING_BOTTOM,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center">
            <BackCircle onPress={onBack} />
            {/* The title centres on the page, not on the space left of the back
                button, so it needs to span the row and centre its own text. */}
            <Text
              variant="heading2"
              color="dark"
              accessibilityRole="header"
              className="-ml-[24px] flex-1 text-center"
            >
              {SECTION_TITLE}
            </Text>
          </View>

          <View
            style={{ marginTop: TITLE_TO_PROGRESS, height: PROGRESS_HEIGHT }}
            className="w-full overflow-hidden rounded-pill bg-progressTrack"
          >
            <View
              style={{
                width: `${(Math.min(step, TOTAL_ONBOARDING_STEPS) / TOTAL_ONBOARDING_STEPS) * 100}%`,
              }}
              className="h-full rounded-pill bg-accent"
            />
          </View>

          <Text
            variant="heading3"
            color="dark"
            style={{ marginTop: PROGRESS_TO_QUESTION }}
            className="text-center"
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              variant="body"
              color="subtle"
              style={{ marginTop: QUESTION_TO_SUBTITLE }}
              className="text-center"
            >
              {subtitle}
            </Text>
          ) : null}

          <View style={{ marginTop: SUBTITLE_TO_CONTENT, gap: CONTENT_GAP }}>{children}</View>

          <View style={{ marginTop: CONTENT_TO_FOOTER, gap: FOOTER_GAP }}>{footer}</View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
