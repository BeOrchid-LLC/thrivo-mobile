import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components";
import { colors } from "@/theme";

export interface WaterProgressRingProps {
  progressPercent: number;
  behind?: boolean;
  size?: number;
}

export function WaterProgressRing({
  progressPercent,
  behind = false,
  size = 136,
}: WaterProgressRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(progressPercent, 100));
  const dashOffset = circumference * (1 - clampedProgress / 100);
  const activeColor = behind ? colors.accent : colors.primary;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.hairline}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {clampedProgress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      <View className="absolute items-center">
        <Text variant="heading2" color="muted">
          {clampedProgress}%
        </Text>
        <Text variant="body" color="muted">
          hydrated
        </Text>
      </View>
    </View>
  );
}
