import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components";
import { colors } from "@/theme";
import { TOTAL_ONBOARDING_STEPS } from "../config";

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar (of 7). Hidden in settings variant. */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned action area (Continue / Skip etc.). */
  footer: ReactNode;
  /** Override the back button behavior (defaults to router.back). */
  onBack?: () => void;
  /**
   * "onboarding" (default): green gradient + progress bar chrome.
   * "settings": plain white background, no progress bar — looks like a settings screen.
   */
  variant?: "onboarding" | "settings";
}

/**
 * Shared chrome for an onboarding step (V2 — Figma section 20:807): green→soft
 * gradient, segmented progress bar, a back button beside the title, content, and
 * a pinned footer. The content area flex-grows so the footer sits at the bottom
 * on short screens and scrolls in on tall ones.
 *
 * In "settings" variant the gradient and progress bar are hidden so the same
 * step components can be re-used from the Settings hub without looking like
 * onboarding.
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
  const inner = (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1">
          {variant === "onboarding" ? (
            <View className="flex-row gap-xs">
              {Array.from({ length: TOTAL_ONBOARDING_STEPS }).map((_, i) => (
                <View
                  key={i}
                  className={`h-[4px] flex-1 rounded-[2px] ${
                    i < step ? "bg-primaryBright" : "bg-progressTrack"
                  }`}
                />
              ))}
            </View>
          ) : null}

          <View className={variant === "onboarding" ? "mt-xl" : undefined}>
            <PageHeader title={title} subtitle={subtitle} onBack={onBack} />
          </View>

          <View className="mt-2xl flex-1 gap-md">{children}</View>

          <View className="mt-xl gap-sm">{footer}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (variant === "settings") {
    return <View style={{ flex: 1, backgroundColor: colors.white }}>{inner}</View>;
  }

  return (
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      {inner}
    </LinearGradient>
  );
}
