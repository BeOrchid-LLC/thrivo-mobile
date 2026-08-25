import { Pressable, View } from "react-native";
import { Text } from "./Text";

export interface TimeFieldProps {
  value: Date;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function formatTime(value: Date): string {
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Standard editable time field used by food and water logging flows. */
export function TimeField({
  value,
  onPress,
  accessibilityLabel = "Change time logged",
}: TimeFieldProps) {
  return (
    <View className="gap-sm">
      <Text variant="caption" color="dark">
        Time logged
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="h-control items-center justify-center rounded-md border border-gray-300 bg-white"
      >
        <Text variant="body" color="dark">
          {formatTime(value)}
        </Text>
      </Pressable>
    </View>
  );
}
