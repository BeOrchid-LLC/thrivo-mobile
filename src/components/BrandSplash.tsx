import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { Text } from "./Text";

export interface BrandSplashProps {
  /** Show the spinner under the wordmark (e.g. while session/fonts resolve). */
  busy?: boolean;
}

/**
 * Branded loading screen shown while fonts and auth status resolve — covers the
 * window between the native splash hiding and the first real screen so there is
 * never a blank flash. Pure tokens, no dependencies.
 */
export function BrandSplash({ busy = true }: BrandSplashProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markGlyph}>T</Text>
      </View>
      <Text variant="heading1" color="dark" style={styles.wordmark}>
        Thrivo
      </Text>
      <Text variant="body" color="muted">
        Weight loss that actually works.
      </Text>
      {busy ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light,
    gap: spacing.sm,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  markGlyph: {
    color: colors.white,
    fontSize: 44,
    fontWeight: "700",
    lineHeight: 52,
  },
  wordmark: { marginTop: spacing.xs },
  spinner: { marginTop: spacing.xl },
});
