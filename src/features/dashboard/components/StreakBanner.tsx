import { Pressable } from "react-native";
import { ArrowRight, Flame } from "phosphor-react-native";
import { Text } from "@/components";
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
      className="flex-row items-center gap-sm rounded-[16px] bg-accentSoft px-lg py-md"
    >
      <Flame size={20} color={colors.accent} weight="fill" />
      <Text variant="body" className="flex-1 font-semibold text-accent">
        {days}-day streak - keep it up!
      </Text>
      <ArrowRight size={18} color={colors.accent} />
    </Pressable>
  );
}
