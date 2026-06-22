import { Pressable, View } from "react-native";
import { Text } from "./Text";

export interface RadioOption<T extends string> {
  label: string;
  value: T;
}

export interface RadioGroupProps<T extends string> {
  options: readonly RadioOption<T>[];
  /** `undefined` renders with no row selected. */
  value: T | undefined;
  onChange: (value: T) => void;
}

/**
 * Vertical single-select radio list in a bordered card (Figma node 20:674). The
 * selected row gets a green tint + filled radio + semibold label; rows are split
 * by hairline dividers. Tokens only.
 */
export function RadioGroup<T extends string>({ options, value, onChange }: RadioGroupProps<T>) {
  return (
    <View className="overflow-hidden rounded-[14px] border-[1.333px] border-gray-300 bg-white">
      {options.map((opt, i) => {
        const active = opt.value === value;
        const divider = i < options.length - 1 ? "border-b-[0.667px] border-gray-100" : "";
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={`min-h-[52px] flex-row items-center gap-[14px] px-lg ${
              active ? "bg-primaryBright/20" : ""
            } ${divider}`}
          >
            <View
              className={`h-[20px] w-[20px] items-center justify-center rounded-pill border-2 ${
                active ? "border-primary bg-primary" : "border-gray-300"
              }`}
            >
              {active ? <View className="h-[8px] w-[8px] rounded-pill bg-white" /> : null}
            </View>
            <Text
              variant="body"
              className={`text-[15px] ${active ? "font-semibold text-dark" : "font-regular text-gray-500"}`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
