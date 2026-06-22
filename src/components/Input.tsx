import { forwardRef, useState, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Optional icon rendered inside the field, before the text. */
  leadingIcon?: ReactNode;
  /** Optional trailing text inside the field (e.g. a unit suffix like "lbs"). */
  trailingText?: string;
  /** Render the label in the V2 onboarding style: uppercase + wide tracking. */
  uppercaseLabel?: boolean;
}

// Derive handler types from the prop itself so we track React Native's event
// type renames across versions (RN 0.81 switched onFocus/onBlur to FocusEvent/BlurEvent).
type FocusHandler = NonNullable<TextInputProps["onFocus"]>;
type BlurHandler = NonNullable<TextInputProps["onBlur"]>;

/**
 * Themed text input with optional label + inline error. The focused state shows
 * the green active ring (`border-primary`); an `error` always wins over focus.
 * Tokens only.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leadingIcon, trailingText, uppercaseLabel, className, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);

  const handleFocus: FocusHandler = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: BlurHandler = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const borderClass = error ? "border-error" : focused ? "border-primary" : "border-gray-300";

  return (
    <View className="gap-xs">
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
        {leadingIcon}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.gray[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`flex-1 py-0 text-[16px] text-dark ${className ?? ""}`}
          {...rest}
        />
        {trailingText ? (
          <Text className="font-regular text-[15px] leading-[22px] text-gray-500">
            {trailingText}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="error" className="ml-xs">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
