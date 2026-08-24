import { Pressable, View } from "react-native";
import { PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { FoodLogEntry } from "@/contracts";
import { useFavorites } from "@/features/food-logging";
import { FavoriteButton } from "@/features/food-logging/components/FavoriteButton";

interface MealLogProps {
  entries: FoodLogEntry[];
  onLogFood: () => void;
  onViewAll: () => void;
  onEntryPress: (entry: FoodLogEntry) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Today's logged foods in reverse consumed-time order. Tap a row to edit it. */
export function MealLog({ entries, onLogFood, onViewAll, onEntryPress }: MealLogProps) {
  useFavorites();
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
          className="min-h-touchTarget flex-row items-center gap-xs"
        >
          <PlusCircle size={18} color={colors.primary} weight="regular" />
          <Text variant="caption" color="primary" className="font-semibold">
            Add
          </Text>
        </Pressable>
      </View>
      {entries.map((entry) => (
        <MealLogRow key={entry.id} entry={entry} onPress={() => onEntryPress(entry)} />
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

function MealLogRow({ entry, onPress }: { entry: FoodLogEntry; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${entry.name}`}
      onPress={onPress}
      className="flex-row items-center justify-between gap-md"
    >
      <View className="flex-1">
        <Text variant="body" color="dark">
          {entry.name}
        </Text>
        <Text variant="caption" color="muted">
          {entry.servings}
          {entry.servingUnit ? ` ${entry.servingUnit}` : " serving"} ·{" "}
          {formatTime(entry.consumedAt)}
        </Text>
      </View>
      <View className="flex-row items-center gap-md">
        <Text variant="body" color="dark">
          {entry.nutrients.calories} kcal
        </Text>
        {entry.foodItemId ? <FavoriteButton foodItemId={entry.foodItemId} size={20} /> : null}
      </View>
    </Pressable>
  );
}
