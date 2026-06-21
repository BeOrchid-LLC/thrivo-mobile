import { Pressable, View } from "react-native";
import { Text } from "@/components";

interface SelectCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Single-select option card (Figma "Cards" component). Selected state uses the
 * brand-green border + a check, matching the design guide. Tokens only.
 */
export function SelectCard({ label, description, selected, onPress }: SelectCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[72px] flex-row items-center justify-between gap-md rounded-lg border-2 bg-white p-lg ${
        selected ? "border-primary" : "border-gray-200"
      }`}
    >
      <View className="flex-1 gap-xs">
        <Text variant="heading3" color="dark">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className={`h-[24px] w-[24px] items-center justify-center rounded-pill border-2 ${
          selected ? "border-primary bg-primary" : "border-gray-300"
        }`}
      >
        {selected ? (
          <Text className="font-bold text-[14px] leading-[16px] text-white">✓</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
