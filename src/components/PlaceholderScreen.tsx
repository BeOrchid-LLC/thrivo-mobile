import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme";
import { Screen } from "./Screen";
import { Text } from "./Text";

export interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  /** Marks screens whose content is premium-gated within the (app) group. */
  premium?: boolean;
}

/**
 * Temporary route scaffold. Each route group renders these until the real
 * feature screens land under src/features. Keeps the navigation tree complete
 * and navigable during setup.
 */
export function PlaceholderScreen({ title, subtitle, premium }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="heading2" color="dark" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="muted" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
        {premium ? (
          <Text variant="caption" color="primary">
            Premium
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { marginBottom: spacing.sm },
  subtitle: { textAlign: "center", marginBottom: spacing.md },
});
