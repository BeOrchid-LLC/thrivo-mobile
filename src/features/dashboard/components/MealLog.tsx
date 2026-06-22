import { Pressable, View } from "react-native";
import { PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { FoodLogEntry, MealType } from "@/contracts";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

// Entry nutrients are per-serving snapshots; multiply by servings for the total.
const entryKcal = (e: FoodLogEntry) => Math.round(e.nutrients.calories * e.servings);

interface MealLogProps {
  entries: FoodLogEntry[];
  onLogFood: (meal: MealType) => void;
}

/** Today's logged foods grouped by meal (Figma dashboard, populated state). */
export function MealLog({ entries, onLogFood }: MealLogProps) {
  const groups = MEAL_ORDER.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  })).filter((g) => g.items.length > 0);

  return (
    <View className="gap-lg">
      {groups.map(({ meal, items }) => {
        const total = items.reduce((sum, e) => sum + entryKcal(e), 0);
        return (
          <View key={meal} className="gap-sm">
            <View className="flex-row items-center justify-between border-b border-gray-200 pb-sm">
              <Text variant="body" color="dark" className="font-semibold">
                {MEAL_LABEL[meal]}{" "}
                <Text variant="body" color="muted" className="font-regular">
                  {total} kcal
                </Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Log food for ${MEAL_LABEL[meal]}`}
                onPress={() => onLogFood(meal)}
                className="flex-row items-center gap-xs"
              >
                <PlusCircle size={18} color={colors.primary} weight="regular" />
                <Text variant="caption" color="primary" className="font-semibold">
                  Log food
                </Text>
              </Pressable>
            </View>
            {items.map((e) => (
              <View key={e.id} className="flex-row justify-between">
                <Text variant="body" color="dark" className="flex-1">
                  {e.name}
                  {e.servings !== 1 ? ` ×${e.servings}` : ""}
                </Text>
                <Text variant="body" color="muted">
                  {entryKcal(e)} kcal
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
