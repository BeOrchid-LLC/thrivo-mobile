import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

// Derive handler types from the prop itself so we track React Native's event
// type renames across versions (RN 0.81 switched onFocus/onBlur to FocusEvent/BlurEvent).
type FocusHandler = NonNullable<TextInputProps["onFocus"]>;
type BlurHandler = NonNullable<TextInputProps["onBlur"]>;

/**
 * Themed text input with optional label + inline error. The focused state shows
 * the green active ring (`colors.primary`); an `error` always wins over focus.
 * Tokens only.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, style, onFocus, onBlur, ...rest },
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

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="caption" color="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.gray[400]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          focused && !error ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.error },
  errorText: { marginLeft: spacing.xs },
});
