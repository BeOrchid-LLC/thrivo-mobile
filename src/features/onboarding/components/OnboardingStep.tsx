import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton, Text } from "@/components";
import { colors } from "@/theme";

const TOTAL_STEPS = 7;

interface OnboardingStepProps {
  /** 1-based step index used for the progress bar (of 7). */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned action area (Continue / Skip etc.). */
  footer: ReactNode;
  /** Override the back button behavior (defaults to router.back). */
  onBack?: () => void;
}

/**
 * Shared chrome for an onboarding step (V2 — Figma section 20:807): green→soft
 * gradient, segmented progress bar, a back button beside the title, content, and
 * a pinned footer. The content area flex-grows so the footer sits at the bottom
 * on short screens and scrolls in on tall ones.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  footer,
  onBack,
}: OnboardingStepProps) {
  return (
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1">
            <View className="flex-row gap-xs">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  className={`h-[4px] flex-1 rounded-[2px] ${
                    i < step ? "bg-primaryBright" : "bg-progressTrack"
                  }`}
                />
              ))}
            </View>

            <View className="mt-xl flex-row items-start gap-lg">
              <BackButton onPress={onBack} />
              <Text
                className="flex-1 font-bold text-[26px] leading-[31px] tracking-[-0.5px] text-dark"
                accessibilityRole="header"
              >
                {title}
              </Text>
            </View>

            {subtitle ? (
              <Text className="mt-sm font-regular text-[15px] leading-[22px] text-[#737373]">
                {subtitle}
              </Text>
            ) : null}

            <View className="mt-2xl flex-1 gap-md">{children}</View>

            <View className="mt-xl gap-sm">{footer}</View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
