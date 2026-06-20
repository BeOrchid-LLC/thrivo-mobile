import type { ReactNode } from "react";
import { View } from "react-native";
import { Screen, Text } from "@/components";

const TOTAL_STEPS = 7;

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
    <Screen scroll style={{ flexGrow: 1 }}>
      <View className="flex-1 gap-xl">
        <View className="flex-row gap-xs">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className={`h-[4px] flex-1 rounded-pill ${i < step ? "bg-primary" : "bg-gray-200"}`}
            />
          ))}
        </View>

        <View className="gap-xs">
          <Text variant="heading2" color="dark">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="flex-1 gap-md">{children}</View>

        <View className="gap-sm">{footer}</View>
      </View>
    </Screen>
  );
}
