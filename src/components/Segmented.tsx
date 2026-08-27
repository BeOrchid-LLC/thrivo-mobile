import { Pressable, View, type ViewStyle } from "react-native";
import { Text, type TextColor } from "./Text";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  /** `undefined` renders with no segment selected (e.g. an unanswered choice). */
  value: T | undefined;
  onChange: (value: T) => void;
  /** Label colour of the selected segment. Defaults to the neutral dark. */
  activeColor?: TextColor;
  style?: ViewStyle;
}

// iOS-style track + selected thumb shadow (V2 — Figma node 20:168). RN shadow has
// no className equivalent, so it stays an inline style on the active segment.
const thumbShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 1.5,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

/**
 * Compact segmented control (single-select). Used for unit (kg/lb), sex, and the
 * dashboard tier toggle. V2 style: a soft track with a white selected thumb +
 * subtle shadow; tokens only.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  activeColor = "dark",
  style,
}: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-md bg-gray-200 p-[3px]" style={style}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={`min-h-[33px] flex-1 items-center justify-center rounded-chip ${active ? "bg-white" : ""}`}
            style={active ? thumbShadow : undefined}
          >
            <Text variant="label" color={active ? activeColor : "gray500"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
