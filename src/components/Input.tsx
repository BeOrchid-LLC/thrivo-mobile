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
   * Which frame set the field is dressed for. Every V2 variant sits the label
   * and hint flush with the field edge rather than the 4pt inset the rest of the
   * app uses; they differ in the fill, and the two that state their label in
   * body colour rather than muted.
   *
   * - `auth`: no fill, so the page gradient shows through.
   * - `onboarding`: white, outlined — the onboarding page is itself a light
   *   gradient, so only white separates a field from the page behind it.
   * - `settings`: the same fill with no resting outline. These frames sit on
   *   white, where the fill alone is the field. Focus and error still ring it:
   *   those are states, not the resting look, and a form with no focus
   *   affordance is a real regression.
   */
  variant?: "default" | "auth" | "onboarding" | "settings";
  /** Render the label in the V2 onboarding style: uppercase + wide tracking. */
  uppercaseLabel?: boolean;
  /**
   * The field's corner treatment. `pill` is the fully-rounded search field the
   * Log Food frame uses; every other field keeps the standard `md` radius.
   */
  shape?: "default" | "pill";
  /**
   * Which keypad this field asks for: whole numbers, or one with a separator.
   *
   * It is a *request*, not a restriction — a hardware keyboard, a paste or
   * autofill can still put letters in, and React Native has no way to refuse a
   * keystroke the way `<input type="number">` does on the web. Deleting the
   * character after the fact makes it appear and then vanish a frame later,
   * which reads as a glitch, so the field keeps what was typed and the screen
   * says what is wrong with it via `error`.
   */
  numeric?: "integer" | "decimal";
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
    shape = "default",
    numeric,
    className,
    style,
    onFocus,
    onBlur,
    keyboardType,
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

  const restingBorder = variant === "settings" ? "border-transparent" : "border-hairline";
  // Figma rings the focused field in Thrivo Green, not the lighter brand green.
  const borderClass = error ? "border-error" : focused ? "border-primaryBright" : restingBorder;
  const isFramed = variant !== "default";
  const captionInset = isFramed ? "" : "ml-xs";
  const captionColor = isFramed ? "subtle" : "muted";
  const fillClass = variant === "auth" ? "bg-transparent" : "bg-white";
  // The V2 frames draw every field on the 14 radius (Figma: InputBox rounded-14).
  const radiusClass = shape === "pill" ? "rounded-pill" : "rounded-group";

  return (
    <View className="gap-sm">
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
          className={`min-h-control flex-row items-center gap-sm border-[1.333px] px-lg ${radiusClass} ${
            trailingAccessory ? "flex-1" : ""
          } ${fillClass} ${borderClass}`}
        >
          {leadingIcon}
          <TextInput
            ref={ref}
            {...rest}
            accessibilityLabel={accessibilityLabel ?? label}
            keyboardType={
              keyboardType ??
              (numeric === "integer" ? "number-pad" : numeric ? "decimal-pad" : undefined)
            }
            inputMode={numeric === "integer" ? "numeric" : numeric ? "decimal" : rest.inputMode}
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
