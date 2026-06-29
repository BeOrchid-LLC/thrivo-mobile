import { Pressable, View } from "react-native";
import { PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { FoodLogEntry } from "@/contracts";

interface MealLogProps {
  entries: FoodLogEntry[];
  onLogFood: () => void;
  onViewAll: () => void;
}

/** Today's logged foods in reverse consumed-time order. */
export function MealLog({ entries, onLogFood, onViewAll }: MealLogProps) {
  const totalCalories = entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0);

  return (
    <View className="gap-lg">
      <View className="flex-row items-center justify-between border-b border-gray-200 pb-sm">
        <Text variant="body" color="dark" className="font-semibold">
          Today{" "}
          <Text variant="body" color="muted" className="font-regular">
            {totalCalories} kcal
          </Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food"
          onPress={onLogFood}
          className="flex-row items-center gap-xs"
        >
          <PlusCircle size={18} color={colors.primary} weight="regular" />
          <Text variant="caption" color="primary" className="font-semibold">
            Add
          </Text>
        </Pressable>
      </View>
      {entries.map((entry) => (
        <View key={entry.id} className="flex-row justify-between gap-md">
          <View className="flex-1">
            <Text variant="body" color="dark">
              {entry.name}
            </Text>
            <Text variant="caption" color="muted">
              {entry.servings}
              {entry.servingUnit ? ` ${entry.servingUnit}` : " serving"}
            </Text>
          </View>
          <Text variant="body" color="dark">
            {entry.nutrients.calories} kcal
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View all food logs"
        onPress={onViewAll}
        className="items-center py-md"
      >
        <Text variant="body" color="primary" className="font-semibold">
          View all logs
        </Text>
      </Pressable>
    </View>
  );
}
