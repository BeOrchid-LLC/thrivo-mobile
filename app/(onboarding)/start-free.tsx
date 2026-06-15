import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "@/components";
import { colors, spacing } from "@/theme";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useCompleteOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

const FREE_FEATURES = [
  "Unlimited barcode scanning",
  "Search & log any food",
  "Daily calories vs a 2,000 kcal target",
  "7 days of food-log history",
];

/** S7 — Figma "Start logging for free": enter the free tier (no card). */
export default function StartFreeStep() {
  const complete = useCompleteOnboarding();

  return (
    <OnboardingStep
      step={7}
      title="You're all set"
      subtitle="Start logging today — free, no card required. Upgrade whenever you like."
      footer={
        <>
          <Button label="Start logging for free" onPress={complete} />
          <Button
            label="See Premium · $14.99/mo"
            variant="ghost"
            onPress={() => router.push("/(onboarding)/premium")}
          />
        </>
      }
    >
      <View style={styles.list}>
        {FREE_FEATURES.map((f) => (
          <View key={f} style={styles.row}>
            <Text style={styles.check} color="primary">
              ✓
            </Text>
            <Text variant="body" color="dark">
              {f}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  check: { fontSize: 18, lineHeight: 24, color: colors.primary },
});
