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
  /**
   * `onboarding` dresses the field for the V2 onboarding frames: the
   * page-background fill, a label flush with the field edge and stated in body
   * colour, and the caret inside a ring. `settings` is the same field with no
   * resting outline — those frames sit on white, where the fill alone is the
   * field. See `Input` for the matching text field.
   */
  variant?: "default" | "onboarding" | "settings";
}

export function SelectInput({
  label,
  value,
  placeholder,
  error,
  uppercaseLabel,
  variant = "default",
  disabled,
  className,
  ...rest
}: SelectInputProps) {
  const display = value || placeholder || "";
  const isFilled = variant === "onboarding" || variant === "settings";
  const restingBorder = variant === "settings" ? "border-transparent" : "border-gray-300";
  const borderClass = error ? "border-error" : restingBorder;

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
          color={isFilled ? "dark" : "muted"}
          className={`${isFilled ? "" : "ml-xs"} ${
            uppercaseLabel ? "uppercase tracking-label" : ""
          }`}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={`min-h-control flex-row items-center gap-sm rounded-md border px-lg ${
          isFilled ? "bg-light" : "bg-white"
        } ${borderClass}`}
      >
        <Text variant="body" color={value ? "dark" : "muted"} className="flex-1">
          {display}
        </Text>
        {isFilled ? (
          // Figma rings the caret on the V2 onboarding and settings frames.
          <View className="h-iconSm w-iconSm items-center justify-center rounded-pill border border-hairline">
            <CaretDown size={12} color={colors.dark} />
          </View>
        ) : (
          <CaretDown size={20} color={colors.gray[500]} />
        )}
      </View>
      {error ? (
        <Text variant="caption" color="error" className={isFilled ? "" : "ml-xs"}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}
