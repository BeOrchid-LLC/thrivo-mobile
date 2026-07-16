import { Pressable, View } from "react-native";
import { Heart, Plus } from "phosphor-react-native";
import { Text } from "@/components";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import type { FoodItem } from "@/contracts";
import { useFavorites, useToggleFavorite } from "../hooks/useFoodLogging";

export interface FoodResultRowProps {
  item: FoodItem;
  onLog: () => void;
  loading?: boolean;
}

export function FoodResultRow({ item, onLog, loading = false }: FoodResultRowProps) {
  // Ensures the local favorites store is synced wherever this row renders,
  // regardless of navigation path (TanStack Query dedupes by key, so this
  // costs nothing extra when a parent already called useFavorites()).
  useFavorites();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = useIsFavorite(item.id);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
          onPress={(event) => {
            event?.stopPropagation?.();
            toggleFavorite(item.id);
          }}
          hitSlop={8}
        >
          <Heart size={22} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
        </Pressable>
      </View>
    </Pressable>
  );
}
