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
    <View className="gap-lg">
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
    // Label, track and readout share one row (Figma). The label and readout
    // columns are fixed so all three tracks start and end on the same x —
    // ragged bar ends are what a flow layout would give.
    //
    // `label` (14/20), not `body` (16/24): the frames set this card's three rows
    // a step below page body text, which is what keeps the card the height it is
    // in the design rather than ~15pt taller.
    <View className="flex-row items-center gap-md">
      <Text variant="label" color="subtle" className="w-labelColumn">
        {label}
      </Text>
      <View className="h-[6px] flex-1 overflow-hidden rounded-pill bg-gray-200">
        {/* Width + color are runtime values, so they stay inline. */}
        <View
          className="h-full rounded-pill"
          style={{ width: `${drawnRatio * 100}%`, backgroundColor: color }}
        />
      </View>
      <AnimatedNumber
        variant="label"
        color="muted"
        className="w-readoutColumn text-right"
        value={Math.round(consumed)}
        format={(n) => `${n}/${target}g`}
      />
    </View>
  );
}
