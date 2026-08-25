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
  /** Rendered beside the field, inside the label/hint group (e.g. unit chips). */
  trailingAccessory?: ReactNode;
  /**
   * Which frame set the field is dressed for. Both V2 variants sit the label and
   * hint flush with the field edge rather than the 4pt inset the rest of the app
   * uses; they differ in the fill, and onboarding states its label and hint in
   * body colour rather than muted.
   *
   * - `auth`: no fill, so the page gradient shows through.
   * - `onboarding`: the page-background fill.
   */
  variant?: "default" | "auth" | "onboarding";
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
    trailingAccessory,
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
  const isFramed = variant !== "default";
  const captionInset = isFramed ? "" : "ml-xs";
  const captionColor = variant === "onboarding" ? "dark" : "muted";
  const fillClass =
    variant === "auth" ? "bg-transparent" : variant === "onboarding" ? "bg-light" : "bg-white";

  return (
    <View className="gap-xs">
      {label ? (
        <Text
          variant="caption"
          color={captionColor}
          className={`${captionInset} ${uppercaseLabel ? "uppercase tracking-label" : ""}`}
        >
          {label}
        </Text>
      ) : null}
      <View className={trailingAccessory ? "flex-row items-center gap-xs" : undefined}>
        <View
          className={`min-h-control flex-row items-center gap-sm rounded-md border px-lg ${
            trailingAccessory ? "flex-1" : ""
          } ${fillClass} ${borderClass}`}
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
            <Text variant="body-sm" color="subtle">
              {trailingText}
            </Text>
          ) : null}
        </View>
        {trailingAccessory}
      </View>
      {error ? (
        <Text variant="caption" color="error" className={captionInset}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={captionColor} className={captionInset}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
