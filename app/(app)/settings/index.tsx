import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Screen, Text } from "@/components";
import { spacing } from "@/theme";

export default function Settings() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="heading2" color="dark">
          Settings
        </Text>
        <Button
          label="Manage subscription"
          variant="secondary"
          onPress={() => router.push("/(app)/settings/subscription")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, paddingTop: spacing.lg },
});
