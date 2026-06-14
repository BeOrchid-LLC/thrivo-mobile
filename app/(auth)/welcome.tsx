import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Screen, Text } from "@/components";
import { spacing } from "@/theme";

/** Onboarding S1: value prop + price upfront, routes to the auth gate. */
export default function Welcome() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text variant="heading1" color="dark" style={styles.title}>
            Thrivo
          </Text>
          <Text variant="body" color="muted">
            Weight loss that actually works.
          </Text>
        </View>
        <Button label="Get started" onPress={() => router.push("/(auth)/sign-in")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingVertical: spacing["2xl"] },
  hero: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { marginBottom: spacing.sm },
});
