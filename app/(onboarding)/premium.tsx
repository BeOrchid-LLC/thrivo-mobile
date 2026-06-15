import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components";
import { colors, spacing } from "@/theme";
import { addDays, localDay } from "@/utils";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useCompleteOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

const PREMIUM_FEATURES = [
  "Personalized calorie target (TDEE)",
  "Protein, carbs & fat macros",
  "Full food-log history",
  "Daily check-in & Thrivo Tips",
  "Weight & water tracking",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a `YYYY-MM-DD` as e.g. "Jun 22, 2026" without relying on Intl. */
function formatDay(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** S8 — Figma "Almost done" premium offer. Honest pricing: exact charge date, no fake timers. */
export default function PremiumStep() {
  const complete = useCompleteOnboarding();
  const chargeDate = formatDay(addDays(localDay(), 7));

  return (
    <OnboardingStep
      step={8}
      title="Try Premium free for 7 days"
      subtitle="$14.99/month after the trial. Cancel anytime in two taps."
      footer={
        <>
          <Button label="Start 7-day free trial" onPress={complete} />
          <Button label="Continue with free" variant="ghost" onPress={complete} />
        </>
      }
    >
      <Card style={styles.priceCard}>
        <Text variant="heading1" color="dark">
          $14.99
          <Text variant="body" color="muted">
            {" "}
            /month
          </Text>
        </Text>
        <Text variant="caption" color="muted">
          Free until {chargeDate}. You won&apos;t be charged if you cancel before then.
        </Text>
      </Card>

      <View style={styles.list}>
        {PREMIUM_FEATURES.map((f) => (
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
  priceCard: { gap: spacing.xs },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  check: { fontSize: 18, lineHeight: 24, color: colors.primary },
});
