import { Pressable } from "react-native";
import { ArrowRight } from "phosphor-react-native";
import { AnimatedNumber, Text } from "@/components";
import { colors } from "@/theme";

interface StreakBannerProps {
  days: number;
  onPress?: () => void;
}

/** Amber streak banner shown on the dashboard once a streak exists (Figma). */
export function StreakBanner({ days, onPress }: StreakBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-md rounded-lg bg-accentSoft p-lg"
    >
      <Text variant="heading3">🔥</Text>
      <AnimatedNumber
        variant="body"
        color="dark"
        className="flex-1 font-semibold"
        value={days}
        format={(n) => `${n}-day streak - keep it up!`}
      />
      <ArrowRight size={18} color={colors.accent} />
    </Pressable>
  );
}
