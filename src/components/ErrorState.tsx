import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme";
import { Text } from "./Text";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Centered error view with optional retry. Paired with LoadingState so every
 * screen handles loading + error explicitly (MOBILE_ARCHITECTURE §7).
 */
export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
  retryLabel = "Retry",
}: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text variant="heading3" color="dark">
        {title}
      </Text>
      <Text variant="body" color="muted" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} variant="secondary" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  message: { textAlign: "center", marginBottom: spacing.md },
});
