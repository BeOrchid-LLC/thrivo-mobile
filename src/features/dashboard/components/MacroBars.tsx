import { View } from "react-native";
import { AnimatedNumber, Text } from "@/components";
import { useCountUp } from "@/hooks/useCountUp";
import { colors } from "@/theme";
import type { MacroTargets } from "@/features/onboarding/utils/tdee";

export interface MacroTotals {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface MacroBarsProps {
  consumed: MacroTotals;
  target: MacroTargets;
}

/** Protein / carbs / fat progress bars (Figma dashboard colors). */
export function MacroBars({ consumed, target }: MacroBarsProps) {
  return (
    <View className="gap-md">
      <MacroBar
        label="Protein"
        consumed={consumed.proteinG}
        target={target.proteinG}
        color={colors.primary}
      />
      <MacroBar
        label="Carbs"
        consumed={consumed.carbsG}
        target={target.carbsG}
        color={colors.accent}
      />
      <MacroBar label="Fat" consumed={consumed.fatG} target={target.fatG} color={colors.dark} />
    </View>
  );
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  // Same curve as the number beside it, so the bar and the "42/150g" land together.
  const drawnRatio = useCountUp(ratio, { decimals: 3 });
  return (
    <View className="gap-xs">
      <View className="flex-row justify-between">
        <Text variant="body" color="dark">
          {label}
        </Text>
        <AnimatedNumber
          variant="caption"
          color="muted"
          value={Math.round(consumed)}
          format={(n) => `${n}/${target}g`}
        />
      </View>
      <View className="h-[8px] overflow-hidden rounded-pill bg-gray-200">
        {/* Width + color are runtime values, so they stay inline. */}
        <View
          className="h-full rounded-pill"
          style={{ width: `${drawnRatio * 100}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}
