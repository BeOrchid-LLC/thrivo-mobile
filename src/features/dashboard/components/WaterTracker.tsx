import { Pressable, View } from "react-native";
import { Drop, PlusCircle, PintGlassIcon } from "phosphor-react-native";
import { Text } from "@/components";
import { colors } from "@/theme";

interface WaterTrackerProps {
  glasses: number;
  targetGlasses?: number;
  onAdd: () => void;
  /** Open the full water log. Optional — without it the card is display-only. */
  onOpen?: () => void;
  adding?: boolean;
  error?: string | null;
}

/** Daily water card: a row of glass icons + an add button (Figma dashboard). */
export function WaterTracker({
  glasses,
  targetGlasses = 8,
  onAdd,
  onOpen,
  adding = false,
  error,
}: WaterTrackerProps) {
  const filled = Math.min(glasses, targetGlasses);
  // The card opens the water log; the add button inside it stays a quick add.
  // `Pressable` only when there is somewhere to go, so a display-only card does
  // not announce itself as a button.
  const Container = onOpen ? Pressable : View;
  return (
    <Container
      accessibilityRole={onOpen ? "button" : undefined}
      accessibilityLabel={onOpen ? "Open water log" : undefined}
      onPress={onOpen}
      className="gap-lg rounded-lg bg-primaryTint p-lg"
    >
      <View className="flex-row items-center">
        <PintGlassIcon size={20} color={colors.primaryDeep} weight="regular" />
        <Text variant="body" color="primaryDeep" className="ml-sm flex-1 font-semibold">
          Drink water
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a glass of water"
          onPress={onAdd}
          disabled={adding}
          hitSlop={8}
        >
          <PlusCircle size={24} color={colors.primaryDeep} weight="regular" />
        </Pressable>
      </View>
      <View className="flex-row items-center">
        <Text variant="label" color="primaryDeep" className="flex-1">
          {glasses} of {targetGlasses} glasses
        </Text>
        <View className="flex-row">
          {Array.from({ length: targetGlasses }).map((_, i) => (
            <Drop
              key={i}
              size={16}
              color={colors.primaryDeep}
              weight={i < filled ? "fill" : "regular"}
            />
          ))}
        </View>
      </View>
      {error ? (
        <Text variant="caption" color="error" className="font-regular">
          {error}
        </Text>
      ) : null}
    </Container>
  );
}
