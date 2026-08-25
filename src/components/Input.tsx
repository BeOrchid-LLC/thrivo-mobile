import { forwardRef, useState, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { colors, inputFont } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Optional icon rendered inside the field, before the text. */
  leadingIcon?: ReactNode;
  /** Optional trailing text inside the field (e.g. a unit suffix like "lbs"). */
  trailingText?: string;
  /** Supporting copy under the field. Hidden while an `error` is showing. */
  hint?: string;
  /**
   * `auth` matches the V2 auth frames: the field takes the page gradient rather
   * than a white fill, and the label/hint sit flush with the field edge instead
   * of the 4pt inset the rest of the app uses.
   */
  variant?: "default" | "auth";
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
  {
    label,
    error,
    leadingIcon,
    trailingText,
    hint,
    variant = "default",
    uppercaseLabel,
    className,
    style,
    onFocus,
    onBlur,
    accessibilityLabel,
    ...rest
  },
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
  const isAuth = variant === "auth";
  const captionInset = isAuth ? "" : "ml-xs";

  return (
    <View className="gap-xs">
      {label ? (
        <Text
          variant="caption"
          color="muted"
          className={`${captionInset} ${uppercaseLabel ? "uppercase tracking-label" : ""}`}
        >
          {label}
        </Text>
      ) : null}
      <View
        className={`min-h-control flex-row items-center gap-sm rounded-md border px-lg ${
          isAuth ? "bg-transparent" : "bg-white"
        } ${borderClass}`}
      >
        {leadingIcon}
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.gray[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`flex-1 py-0 ${className ?? ""}`}
          style={[inputFont("body"), { color: colors.dark }, style]}
        />
        {trailingText ? (
          <Text variant="body-sm" color="gray500">
            {trailingText}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="error" className={captionInset}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" className={captionInset}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
