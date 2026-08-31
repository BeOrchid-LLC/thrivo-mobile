import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeftIcon, KeyboardAvoider, PageHeader, Text, type TextColor } from "@/components";
import { colors, spacing, typography } from "@/theme";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from "../config";

/**
 * Metrics for the onboarding frames (393pt wide), measured off the S1–S3
 * exports. Where a value lands on a token it uses the token; the rest are
 * literals for the same reason the auth shell uses them — the scale has no 45.
 *
 * ⚠️ Screenshot-derived, so each carries roughly ±2pt: at the export scale one
 * pixel is 2.2pt. `PAGE_PADDING_X` is the firmest of them (three frames agree);
 * `HEADER_TO_CONTENT` the softest (S1 reads 48pt, S2 reads 41pt).
 */
const PAGE_PADDING_X = spacing.xl;
/** Air between the status bar and the progress segments (Figma: pt-67 − 47pt inset). */
const HEADER_TOP = 20;
const PROGRESS_HEIGHT = 4;
/** Gap between two progress segments. */
const PROGRESS_SEGMENT_GAP = 4;
const PROGRESS_TO_TITLE = 28;
/** Gap between the back arrow and the title it sits beside (Figma: gap-16). */
const BACK_TO_TITLE = spacing.lg;
const TITLE_TO_SUBTITLE = 8;
/** Air below the pinned header, so content never starts flush against it. */
const HEADER_TO_CONTENT = 28;
const CONTENT_GAP = 16;
const CONTENT_TO_FOOTER = 45;
/** Continue → the text link under it (Figma: the footer column is gap-24). */
const FOOTER_GAP = spacing.xl;
/** Air above and below the pinned actions, on top of the safe-area inset. */
const FOOTER_PADDING_Y = 16;

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar. Hidden in settings variant. */
  step: number;
  title: string;
  subtitle?: string;
  /** Subtitle colour. The frames state it grey on the question steps, dark on S7. */
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
   * "onboarding" (default): gradient page, left-aligned title, progress bar.
   * "settings": the same gradient page with the step's own title in a left-
   * aligned page header and no progress bar — the shape the standalone settings
   * screens use, because the same step components are re-used from Settings.
   */
  variant?: "onboarding" | "settings";
}

/**
 * Back affordance from the frames: a bare left arrow beside the title, no
 * circle. The first step has nothing behind it, so it renders no button at all
 * rather than one that fails.
 */
function BackArrow({ step, onPress }: { step: number; onPress?: () => void }) {
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
      // Boxed to the title's line height so the arrow centres on the title's
      // *first* line rather than on the whole two-line block.
      style={{ height: typography.pageTitle.lineHeight }}
      className="w-icon items-center justify-center active:opacity-[0.6]"
    >
      <ChevronLeftIcon />
    </Pressable>
  );
}

/**
 * The flow's progress readout: one segment per step, filled up to and including
 * the current one. Segmented rather than a single track because the frames draw
 * the steps as countable — the user can see how many are left, which a
 * percentage bar never says.
 */
function StepProgress({ step }: { step: number }) {
  const reached = Math.min(Math.max(step, 0), TOTAL_ONBOARDING_STEPS);

  return (
    <View
      className="flex-row"
      style={{ gap: PROGRESS_SEGMENT_GAP }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: TOTAL_ONBOARDING_STEPS, now: reached }}
      accessibilityLabel={`Step ${reached} of ${TOTAL_ONBOARDING_STEPS}`}
    >
      {ONBOARDING_STEPS.map(({ key }, index) => (
        <View
          key={key}
          style={{ height: PROGRESS_HEIGHT }}
          className={`flex-1 rounded-pill ${index < reached ? "bg-primaryBright" : "bg-progressTrack"}`}
        />
      ))}
    </View>
  );
}

/**
 * Shared chrome for an onboarding step (Figma "Onboarding S1"): the light →
 * soft-green page gradient, the segmented progress track pinned at the top, a
 * left-aligned question with the back arrow beside it, its subtitle, the step
 * content, and the actions below it.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
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
        {/* Pinned: the progress track, back arrow, question and subtitle stay
            put while the step's own content scrolls under them. The frames draw
            the question as the page's title rather than as the first thing in
            the scroller, so it stays with the progress it belongs to. The page
            gradient starts at this token, so the backdrop the content scrolls
            behind is the same colour as the page it covers. */}
        <View
          style={{
            paddingHorizontal: PAGE_PADDING_X,
            paddingTop: HEADER_TOP,
            paddingBottom: HEADER_TO_CONTENT,
            backgroundColor: colors.light,
          }}
        >
          <StepProgress step={step} />

          <View
            className="flex-row items-start"
            style={{ marginTop: PROGRESS_TO_TITLE, gap: BACK_TO_TITLE }}
          >
            <BackArrow step={step} onPress={onBack} />
            <Text
              variant="pageTitle"
              color="dark"
              accessibilityRole="header"
              className="flex-1 tracking-title"
            >
              {title}
            </Text>
          </View>

          {subtitle ? (
            <Text variant="body-sm" color={subtitleColor} style={{ marginTop: TITLE_TO_SUBTITLE }}>
              {subtitle}
            </Text>
          ) : null}
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
              paddingBottom: contentToFooter,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: contentGap }}>{children}</View>
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
