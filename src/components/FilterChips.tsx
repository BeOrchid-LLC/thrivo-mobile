import { X } from "phosphor-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface FilterChipsProps {
  chips: FilterChip[];
}

export function FilterChips({ chips }: FilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
      <View className="flex-row gap-sm py-xs">
        {chips.map((chip) => (
          <Pressable
            key={chip.key}
            accessibilityRole="button"
            accessibilityLabel={`Remove filter: ${chip.label}`}
            onPress={chip.onRemove}
            className="flex-row items-center gap-xs rounded-full bg-primary/10 px-md py-xs"
          >
            <Text variant="caption" color="primary" className="font-medium">
              {chip.label}
            </Text>
            <X size={12} color={colors.primary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
