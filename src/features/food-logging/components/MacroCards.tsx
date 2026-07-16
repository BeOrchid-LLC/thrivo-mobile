import { View } from "react-native";
import { Text } from "@/components";

export interface MacroCardsProps {
  nutrients: { proteinG: number; carbsG: number; fatG: number };
}

/** Compact P/C/F cards — shared by describe-meal and log/edit sheets. */
export function MacroCards({ nutrients }: MacroCardsProps) {
  return (
    <View className="flex-row gap-md">
      {[
        ["Protein", nutrients.proteinG],
        ["Carbs", nutrients.carbsG],
        ["Fat", nutrients.fatG],
      ].map(([label, value]) => (
        <View key={label as string} className="flex-1 items-center rounded-md bg-primarySoft p-md">
          <Text variant="caption" color="dark">
            {label}
          </Text>
          <Text variant="heading3" color="dark">
            {formatMacroGrams(value as number)}g
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatMacroGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
