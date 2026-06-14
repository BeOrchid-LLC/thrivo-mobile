import { StyleSheet, View } from "react-native";
import { Screen, Text } from "@/components";
import { spacing } from "@/theme";

export default function Index() {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="heading1" color="dark" style={styles.title}>
          Thrivo
        </Text>
        <Text variant="body" color="muted">
          Weight loss that actually works.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { marginBottom: spacing.md },
});
