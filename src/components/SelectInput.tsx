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
   * colour, and the caret inside a ring.
   */
  variant?: "default" | "onboarding";
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
  const borderClass = error ? "border-error" : "border-gray-300";
  const isOnboarding = variant === "onboarding";

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
          color={isOnboarding ? "dark" : "muted"}
          className={`${isOnboarding ? "" : "ml-xs"} ${
            uppercaseLabel ? "uppercase tracking-label" : ""
          }`}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={`min-h-control flex-row items-center gap-sm rounded-md border px-lg ${
          isOnboarding ? "bg-light" : "bg-white"
        } ${borderClass}`}
      >
        <Text variant="body" color={value ? "dark" : "muted"} className="flex-1">
          {display}
        </Text>
        {isOnboarding ? (
          // Figma rings the caret on the onboarding frames.
          <View className="h-iconSm w-iconSm items-center justify-center rounded-pill border border-hairline">
            <CaretDown size={12} color={colors.dark} />
          </View>
        ) : (
          <CaretDown size={20} color={colors.gray[500]} />
        )}
      </View>
      {error ? (
        <Text variant="caption" color="error" className={isOnboarding ? "" : "ml-xs"}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}
