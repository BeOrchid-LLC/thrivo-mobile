import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components";
import { addDays, localDay } from "@/utils";
import { colors, spacing } from "@/theme";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

const TRIAL_FEATURES = [
  "Personalized calorie target",
  "Protein, carbs, and fat goals",
  "Food logging and barcode scan",
  "Daily nudges to keep momentum",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export default function StartFreeStep() {
  const { submit, isPending } = useSubmitOnboarding();
  const [error, setError] = useState<string | null>(null);
  const trialEnd = formatDay(addDays(localDay(), 7));

  const startTrial = async () => {
    setError(null);
    try {
      await submit("start_free_trial", { onboardingStep: 6 });
      router.push("/(onboarding)/notifications");
    } catch {
      setError("We couldn't start your trial. Please try again.");
    }
  };

  const skip = async () => {
    await submit("skip", { silent: true, onboardingStep: 6 });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={6}
      title="Start your 7-day free trial"
      subtitle="No charge today. Your account switches to the free plan after the trial unless you upgrade."
      footer={
        <>
          <Button label="Start 7-day free trial" loading={isPending} onPress={startTrial} />
          <Button label="Skip for now" variant="ghost" disabled={isPending} onPress={skip} />
        </>
      }
    >
      <Card style={styles.priceCard}>
        <Text variant="heading1" color="dark">
          Free
          <Text variant="body" color="muted">
            {" "}
            for 7 days
          </Text>
        </Text>
        <Text variant="caption" color="muted">
          Trial ends {trialEnd}. Billing setup comes later when you choose a paid plan.
        </Text>
      </Card>

      <View style={styles.list}>
        {TRIAL_FEATURES.map((feature) => (
          <View key={feature} style={styles.row}>
            <Text style={styles.check} color="primary">
              ✓
            </Text>
            <Text variant="body" color="dark">
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {error ? (
        <Text variant="caption" color="error" selectable>
          {error}
        </Text>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  priceCard: { gap: spacing.xs },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  check: { fontSize: 18, lineHeight: 24, color: colors.primary },
});
