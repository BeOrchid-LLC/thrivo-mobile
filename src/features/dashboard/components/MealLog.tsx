import { Pressable, View } from "react-native";
import { PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";
import type { MealGroup, MealType } from "@/contracts";

const entryKcal = (calories: number, servings: number) => Math.round(calories * servings);

interface MealLogProps {
  groups: MealGroup[];
  onLogFood: (meal: MealType) => void;
  onViewAll: () => void;
}

/** Today's logged foods grouped by meal (Figma dashboard, populated state). */
export function MealLog({ groups, onLogFood, onViewAll }: MealLogProps) {
  return (
    <View className="gap-lg">
      {groups.map((group, index) => (
        <View key={group.meal} className="gap-sm">
          <View className="flex-row items-center justify-between border-b border-gray-200 pb-sm">
            <Text variant="body" color="dark" className="font-semibold">
              {group.label}{" "}
              <Text variant="body" color="muted" className="font-regular">
                {group.calories} kcal
              </Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log food for ${group.label}`}
              onPress={() => onLogFood(group.meal)}
              className="flex-row items-center gap-xs"
            >
              <PlusCircle size={18} color={colors.primary} weight="regular" />
              <Text variant="caption" color="primary" className="font-semibold">
                {index === 0 ? "Log food" : "Add"}
              </Text>
            </Pressable>
          </View>
          {group.entries.map((e) => (
            <View key={e.id} className="flex-row justify-between gap-md">
              <Text variant="body" color="dark" className="flex-1">
                {e.name}
                {e.servings !== 1 ? `, ${e.servings}${e.servingUnit ?? " servings"}` : ""}
              </Text>
              <Text variant="body" color="dark">
                {entryKcal(e.nutrients.calories, e.servings)} kcal
              </Text>
            </View>
          ))}
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
