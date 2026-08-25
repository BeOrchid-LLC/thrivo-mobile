import { Pressable } from "react-native";
import { ArrowRight, Flame } from "phosphor-react-native";
import { AnimatedNumber } from "@/components";
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
      className="flex-row items-center gap-sm rounded-lg bg-accentSoft px-lg py-md"
    >
      <Flame size={20} color={colors.accent} weight="fill" />
      <AnimatedNumber
        variant="body"
        color="accent"
        className="flex-1 font-semibold"
        value={days}
        format={(n) => `${n}-day streak - keep it up!`}
      />
      <ArrowRight size={18} color={colors.accent} />
    </Pressable>
  );
}
