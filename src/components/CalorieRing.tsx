import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useCountUp } from "@/hooks/useCountUp";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  /** Shown centered (instead of "x% Used") when nothing has been consumed yet. */
  emptyLabel?: string;
}

/**
 * Circular calorie-progress ring (Figma dashboard). Shows the percentage of the
 * daily target consumed; the arc fills clockwise from the top and caps at 100%.
 * When nothing is consumed and `emptyLabel` is set, the ring stays neutral and
 * shows that prompt instead. SVG stroke colors read theme tokens directly.
 */
export function CalorieRing({
  consumed,
  target,
  size = 100,
  strokeWidth = 12,
  emptyLabel,
}: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const center = size / 2;
  const isEmpty = consumed <= 0 && Boolean(emptyLabel);
  // The arc and the percentage share one curve, so the number never reads ahead
  // of the stroke. Three decimals keeps the sweep continuous rather than
  // stepping through whole percent.
  const drawnRatio = useCountUp(ratio, { decimals: 3, enabled: !isEmpty });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.gray[200]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {!isEmpty && drawnRatio > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.primaryBright}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * drawnRatio} ${circumference}`}
            transform={`rotate(90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View className="absolute inset-0 items-center justify-center px-md">
        {isEmpty ? (
          <Text variant="caption" color="dark" className="mx-1 text-center font-semibold">
            {emptyLabel}
          </Text>
        ) : (
          <>
            <Text variant="metric" color="dark" accessibilityLabel={`${Math.round(ratio * 100)}%`}>
              {Math.round(drawnRatio * 100)}%
            </Text>
            <Text variant="micro" color="subtle" className="font-semibold">
              Used
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
