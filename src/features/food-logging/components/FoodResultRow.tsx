import { Pressable, View } from "react-native";
import { Plus } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { FoodItem } from "@/contracts";
import { FavoriteButton } from "./FavoriteButton";

export interface FoodResultRowProps {
  item: FoodItem;
  onLog: () => void;
  loading?: boolean;
}

export function FoodResultRow({ item, onLog, loading = false }: FoodResultRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log ${item.name}`}
      disabled={loading}
      onPress={onLog}
      className="flex-row items-center justify-between gap-md border-b border-gray-200 py-sm"
    >
      <View className="flex-1">
        <Text variant="body" color="dark">
          {item.name}
        </Text>
        <Text variant="caption" color="dark">
          {item.nutrients.calories} kcal per {item.servingLabel}
          {item.isEstimated ? "  Estimated" : ""}
        </Text>
      </View>
      <View className="flex-row items-center gap-md">
        <Plus size={22} color={colors.primary} />
        <FavoriteButton foodItemId={item.id} size={22} />
      </View>
    </Pressable>
  );
}
