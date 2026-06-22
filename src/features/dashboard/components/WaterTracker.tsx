import { Pressable, View } from "react-native";
import { Drop, PlusCircle } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";

const GLASS_TARGET = 8;

interface WaterTrackerProps {
  glasses: number;
  onAdd: () => void;
  adding?: boolean;
}

/** Daily water card: a row of glass icons + an add button (Figma dashboard). */
export function WaterTracker({ glasses, onAdd, adding = false }: WaterTrackerProps) {
  const filled = Math.min(glasses, GLASS_TARGET);
  return (
    <View className="gap-sm rounded-[16px] bg-primarySoft px-lg py-md">
      <View className="flex-row items-center">
        <Drop size={22} color={colors.primary} weight="regular" />
        <Text variant="body" className="ml-sm flex-1 font-semibold text-primary">
          Drink water
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a glass of water"
          onPress={onAdd}
          disabled={adding}
          hitSlop={8}
        >
          <PlusCircle size={24} color={colors.primary} weight="regular" />
        </Pressable>
      </View>
      <View className="flex-row items-center">
        <Text variant="body" color="muted" className="flex-1">
          {glasses} of {GLASS_TARGET} glasses
        </Text>
        <View className="flex-row gap-xs">
          {Array.from({ length: GLASS_TARGET }).map((_, i) => (
            <Drop
              key={i}
              size={20}
              color={colors.primary}
              weight={i < filled ? "fill" : "regular"}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
