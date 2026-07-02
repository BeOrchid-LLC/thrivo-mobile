import { Pressable, View, type PressableProps } from "react-native";
import { CaretDown } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface SelectInputProps extends Omit<PressableProps, "children"> {
  label?: string;
  value: string;
  placeholder?: string;
  error?: string;
  uppercaseLabel?: boolean;
}

export function SelectInput({
  label,
  value,
  placeholder,
  error,
  uppercaseLabel,
  disabled,
  className,
  ...rest
}: SelectInputProps) {
  const display = value || placeholder || "";
  const borderClass = error ? "border-error" : "border-gray-300";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`gap-xs ${className ?? ""}`}
      {...rest}
    >
      {label ? (
        <Text
          variant="caption"
          color="muted"
          className={`ml-xs ${uppercaseLabel ? "uppercase tracking-[0.78px]" : ""}`}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={`min-h-[48px] flex-row items-center gap-sm rounded-md border bg-white px-lg ${borderClass}`}
      >
        <Text color={value ? "dark" : "muted"} className="flex-1 text-[16px]">
          {display}
        </Text>
        <CaretDown size={20} color={colors.gray[500]} />
      </View>
      {error ? (
        <Text variant="caption" color="error" className="ml-xs">
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}
