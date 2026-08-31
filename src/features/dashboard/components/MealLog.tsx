import { Pressable, View } from "react-native";
import { CaretRight, PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { FoodLogEntry, MealTime } from "@/contracts";
import { useFavorites } from "@/features/food-logging";
import { FavoriteButton } from "@/features/food-logging/components/FavoriteButton";
import { groupEntriesByMealTime } from "@/features/food-logging/utils/copyLog";

interface MealLogProps {
  entries: FoodLogEntry[];
  onLogFood: () => void;
  onViewAll: () => void;
  onEntryPress: (entry: FoodLogEntry) => void;
}

/**
 * The meal-time buckets are named by their window in the history filter
 * ("Morning · 4:00 AM – 10:59 AM"); on the dashboard the same buckets are named
 * by the meal they hold, which is how the Figma frames label them.
 */
const MEAL_TIME_TITLE: Record<MealTime, string> = {
  morning: "Breakfast",
  afternoon: "Lunch",
  evening: "Dinner",
  night: "Late snack",
};

/** The serving as the Figma rows write it — "Greek yoghurt, 150g". */
function servingSuffix(entry: FoodLogEntry): string {
  if (!entry.servingUnit) return "";
  return `, ${entry.servings}${entry.servingUnit}`;
}

/** Today's logged foods, grouped by meal. Tap a row to edit it. */
export function MealLog({ entries, onLogFood, onViewAll, onEntryPress }: MealLogProps) {
  useFavorites();
  const groups = groupEntriesByMealTime(entries);

  return (
    <View className="gap-sm">
      {groups.map((group) => {
        const title = MEAL_TIME_TITLE[group.mealTime];
        return (
          <View key={group.mealTime} className="gap-sm">
            <View className="mb-xs flex-row items-center justify-between border-b border-gray-200 pb-sm">
              <Text variant="body" color="dark">
                {title}{" "}
                <Text variant="body" color="subtle">
                  {group.calories} kcal
                </Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View all ${title.toLowerCase()} logs`}
                onPress={onViewAll}
                className="flex-row items-center gap-xs"
                hitSlop={12}
              >
                <Text variant="body" color="subtle">
                  View
                </Text>
                <CaretRight size={20} color={colors.muted} />
              </Pressable>
            </View>
            {group.entries.map((entry) => (
              <MealLogRow key={entry.id} entry={entry} onPress={() => onEntryPress(entry)} />
            ))}
          </View>
        );
      })}
      {/* Figma 371:560: a full-width rule, an 8pt gap, then a 44pt row that
          centres the 24pt glyph and the label. The rule is part of this footer
          rather than the last meal group, so an empty day still renders it. */}
      <View className="gap-sm border-t border-gray-200 pt-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food"
          onPress={onLogFood}
          className="h-tile flex-row items-center justify-center gap-sm"
        >
          <PlusCircle size={24} color={colors.primaryDeep} weight="regular" />
          <Text variant="body" color="primaryDeep" className="font-semibold">
            Log food
          </Text>
        </Pressable>
      </View>
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
      <Text variant="body" color="dark" className="flex-1">
        {entry.name}
        {servingSuffix(entry)}
      </Text>
      <View className="flex-row items-center gap-md">
        <Text variant="body" color="dark">
          {entry.nutrients.calories} kcal
        </Text>
        {entry.foodItemId ? <FavoriteButton foodItemId={entry.foodItemId} size={20} /> : null}
      </View>
    </Pressable>
  );
}
