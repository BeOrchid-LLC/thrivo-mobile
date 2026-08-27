import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeftIcon, KeyboardAvoider, PageHeader, Text, type TextColor } from "@/components";
import { colors, spacing } from "@/theme";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from "../config";

/**
 * Figma-exact metrics for the onboarding frames (393pt wide). Literals for the
 * same reason the auth shell uses them: the scale has no 20, 13 or 33.
 */
const PAGE_PADDING_X = 20;
const BACK_SIZE = 24;
// The frame draws no status bar, so its title sits ~7pt above where a real
// safe-area inset puts ours; this gap absorbs that so the progress bar and
// everything under it land on the frame's positions.
const TITLE_TO_PROGRESS = 13;
const PROGRESS_HEIGHT = 4;
const PROGRESS_TO_QUESTION = 32;
/** Air below the pinned progress bar, so content never scrolls flush to it. */
const PROGRESS_BOTTOM_INSET = 4;
const QUESTION_TO_SUBTITLE = 9;
const SUBTITLE_TO_CONTENT = 33;
const CONTENT_GAP = 16;
const CONTENT_TO_FOOTER = 45;
const FOOTER_GAP = 24;
/** Air above and below the pinned actions, on top of the safe-area inset. */
const FOOTER_PADDING_Y = 16;

/** Header shown above most onboarding steps; the question below it is per-step. */
const SECTION_TITLE = "Get settled in";

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar. Hidden in settings variant. */
  step: number;
  title: string;
  subtitle?: string;
  /** Page header above the question. Defaults to the flow-wide section title. */
  sectionTitle?: string;
  /** Subtitle colour. The frames state it grey on the question steps, dark on S6. */
  subtitleColor?: TextColor;
  children: ReactNode;
  /** Action area (Continue / Skip etc.). */
  footer: ReactNode;
  /** Gap between content rows. Defaults to the card spacing the frames use. */
  contentGap?: number;
  /** Space the content keeps clear of the pinned actions when scrolled to the end. */
  contentToFooter?: number;
  /** Override the back button behavior (defaults to router.back). */
  onBack?: () => void;
  /**
   * "onboarding" (default): gradient page, centred section header, progress bar.
   * "settings": the same gradient page with the step's own title in a left-
   * aligned page header and no progress bar — the shape the standalone settings
   * screens use, because the same step components are re-used from Settings.
   */
  variant?: "onboarding" | "settings";
}

/**
 * Circular back affordance from the frames. The first step has nothing behind
 * it, so it renders no button at all rather than one that fails.
 */
function BackCircle({ step, onPress }: { step: number; onPress?: () => void }) {
  if (onPress === undefined && step <= 1) return null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Reached directly (a deep link, or a redirect that replaced the stack), so
    // there is no history to pop — step back through the flow instead.
    const previous = ONBOARDING_STEPS.find((definition) => definition.step === step - 1);
    if (previous) router.replace(`/(onboarding)/${previous.key}`);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={onPress ?? goBack}
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
  sectionTitle = SECTION_TITLE,
  subtitleColor = "subtle",
  children,
  footer,
  contentGap = CONTENT_GAP,
  contentToFooter = CONTENT_TO_FOOTER,
  onBack,
  variant = "onboarding",
}: OnboardingStepProps) {
  if (variant === "settings") {
    return (
      // The same page as the onboarding frames, minus the flow chrome: reached
      // from Settings, there is no flow to show progress through, and the step's
      // own question becomes the page title.
      <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
        {/* `bottom` included on purpose: the actions are pinned to the page,
            so without the inset they sit on the home indicator. The strip it
            leaves below them is the tail of the same gradient the footer is
            painted in, so the two read as one surface. */}
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right", "bottom"]}>
          <View
            style={{
              paddingHorizontal: PAGE_PADDING_X,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <PageHeader title={title} subtitle={subtitle} onBack={onBack} />
          </View>

          {/* The step and its actions lift together above the keyboard — these
              steps are mostly fields, and without it the actions sit behind the
              keyboard with no way to scroll to them. */}
          <KeyboardAvoider>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: PAGE_PADDING_X,
                paddingVertical: spacing.xl,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flex: 1, gap: contentGap }}>{children}</View>
            </ScrollView>

            {/* Pinned, like the onboarding footer: the gradient ends on this
                token, so the backdrop the content scrolls out from behind is the
                same colour as the page. */}
            <View
              style={{
                paddingHorizontal: PAGE_PADDING_X,
                paddingTop: FOOTER_PADDING_Y,
                paddingBottom: FOOTER_PADDING_Y,
                gap: FOOTER_GAP,
                backgroundColor: colors.primarySoft,
              }}
            >
              {footer}
            </View>
          </KeyboardAvoider>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    // Same gradient pairing as the auth screens, so the pre-app surfaces read as
    // one set.
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Pinned: the section title, back button and progress bar stay put
            while the step scrolls under them. The page gradient starts at this
            token, so the backdrop the content scrolls behind is the same colour
            as the page it covers. */}
        <View
          style={{
            paddingHorizontal: PAGE_PADDING_X,
            paddingBottom: PROGRESS_BOTTOM_INSET,
            backgroundColor: colors.light,
          }}
        >
          {/* The title centres on the page rather than on the space beside the
              back button, so the button is laid over the row instead of taking
              space in it — and it comes second so it stays on top of the title
              and keeps receiving taps. */}
          <View className="flex-row items-center justify-center">
            <Text variant="heading2" color="dark" accessibilityRole="header">
              {sectionTitle}
            </Text>
            <View className="absolute bottom-0 left-0 top-0 justify-center">
              <BackCircle step={step} onPress={onBack} />
            </View>
          </View>

          <View
            style={{ height: PROGRESS_HEIGHT, marginTop: TITLE_TO_PROGRESS }}
            className="w-full overflow-hidden rounded-pill bg-progressTrack"
          >
            <View
              style={{
                width: `${(Math.min(step, TOTAL_ONBOARDING_STEPS) / TOTAL_ONBOARDING_STEPS) * 100}%`,
              }}
              className="h-full rounded-pill bg-accent"
            />
          </View>
        </View>

        {/* Everything below the pinned header lifts above the keyboard: the
            step scrolls in what is left, and the actions stay reachable instead
            of sitting behind the keyboard. The header stays put, because it is
            outside the lift. */}
        <KeyboardAvoider>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: PAGE_PADDING_X,
              paddingTop: PROGRESS_TO_QUESTION,
              paddingBottom: contentToFooter,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="heading3" color="dark" className="text-center">
              {title}
            </Text>

            {subtitle ? (
              <Text
                variant="body"
                color={subtitleColor}
                style={{ marginTop: QUESTION_TO_SUBTITLE }}
                className="text-center"
              >
                {subtitle}
              </Text>
            ) : null}

            <View style={{ marginTop: SUBTITLE_TO_CONTENT, gap: contentGap }}>{children}</View>
          </ScrollView>

          {/* Pinned, like the header: the page gradient ends on this token, so the
              backdrop the content scrolls out from behind matches the page. */}
          <View
            style={{
              paddingHorizontal: PAGE_PADDING_X,
              paddingTop: FOOTER_PADDING_Y,
              paddingBottom: FOOTER_PADDING_Y,
              gap: FOOTER_GAP,
              backgroundColor: colors.primarySoft,
            }}
          >
            {footer}
          </View>
        </KeyboardAvoider>
      </SafeAreaView>
    </LinearGradient>
  );
}
