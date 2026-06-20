import { Pressable, View, type ViewStyle } from "react-native";
import { Text } from "./Text";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  /** `undefined` renders with no segment selected (e.g. an unanswered choice). */
  value: T | undefined;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * Compact segmented control (single-select). Used for unit (kg/lb), sex, and the
 * dashboard tier toggle. Tokens only; the active segment fills with the brand green.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>) {
  return (
    <View className="flex-row gap-xs rounded-md bg-gray-100 p-xs" style={style}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={`min-h-[40px] flex-1 items-center justify-center rounded-sm px-sm ${active ? "bg-primary" : ""}`}
          >
            <Text variant="caption" color={active ? "inverse" : "dark"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
