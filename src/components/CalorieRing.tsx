import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Circular calorie-progress ring (Figma dashboard). Shows the percentage of the
 * daily target consumed; the arc fills clockwise from the top and caps at 100%.
 * SVG stroke colors are runtime props, so they read the theme tokens directly.
 */
export function CalorieRing({ consumed, target, size = 140, strokeWidth = 12 }: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const center = size / 2;

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
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text variant="heading2" color="dark">
          {Math.round(ratio * 100)}%
        </Text>
        <Text variant="caption" color="muted">
          Used
        </Text>
      </View>
    </View>
  );
}
