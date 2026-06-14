import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { Text } from "./Text";

export interface LoadingStateProps {
  message?: string;
}

/**
 * Centered loading indicator. Every data-fetching screen renders this while a
 * query is pending — never a blank flash (MOBILE_ARCHITECTURE §7).
 */
export function LoadingState({ message }: LoadingStateProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <Text variant="caption" color="muted" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  message: { marginTop: spacing.sm },
});
