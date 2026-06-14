import { forwardRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "@/theme";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/** Themed text input with optional label + inline error. Tokens only. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, style, ...rest },
  ref
) {
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
        style={[styles.input, error ? styles.inputError : null, style]}
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
  inputError: { borderColor: colors.error },
  errorText: { marginLeft: spacing.xs },
});
