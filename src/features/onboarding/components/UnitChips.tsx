import { Pressable, View } from "react-native";
import { Text } from "@/components";

export interface UnitChipsOption<T extends string> {
  label: string;
  value: T;
}

interface UnitChipsProps<T extends string> {
  options: readonly UnitChipsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Figma: 60pt chips, the same 48pt height as the field they sit beside. */
const CHIP_WIDTH = 60;

/**
 * The unit selector from the onboarding weight frame: a chip per unit beside the
 * field, the selected one tinted and green-bordered. Distinct from `Segmented`,
 * which draws one track with an inset thumb.
 */
export function UnitChips<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: UnitChipsProps<T>) {
  return (
    <View className="flex-row gap-xs" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{ width: CHIP_WIDTH }}
            className={`min-h-control items-center justify-center rounded-md border active:opacity-[0.85] ${
              selected ? "border-2 border-primary bg-primary/20" : "border-hairline bg-light"
            }`}
          >
            <Text variant="body" color={selected ? "dark" : "subtle"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
