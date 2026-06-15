import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "@/components";
import { colors, spacing } from "@/theme";
import { useOnboardingDraft } from "@/stores";
import { buildDemoProfile } from "@/stores/demo-profile.store";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";

const GOAL_LABEL: Record<string, string> = {
  lose: "Weight loss",
  maintain: "Maintenance",
  gain: "Muscle gain",
};

/** S6 — Figma "Almost done": the personalized daily target + how it was derived. */
export default function TargetStep() {
  const draft = useOnboardingDraft();
  const p = buildDemoProfile(draft);

  const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <OnboardingStep
      step={6}
      title="Your daily calorie target"
      subtitle="Based on the Mifflin-St Jeor equation. You can fine-tune this later."
      footer={
        <Button
          label="This looks right — continue"
          onPress={() => router.push("/(onboarding)/start-free")}
        />
      }
    >
      <Card style={styles.hero}>
        <Text variant="heading1" color="primary">
          {p.dailyTargetKcal.toLocaleString()}
        </Text>
        <Text variant="body" color="muted">
          calories per day · {GOAL_LABEL[p.goal]}
        </Text>
      </Card>

      <Card>
        <Text variant="heading3" color="dark" style={styles.cardTitle}>
          How we calculated this
        </Text>
        <Row label="Basal metabolic rate (BMR)" value={`${p.bmr.toLocaleString()} kcal`} />
        <Row
          label={`Activity ×${p.activityFactor} (${p.activity})`}
          value={`${p.maintenanceKcal.toLocaleString()} kcal`}
        />
        <Row label="Goal adjustment" value={`${signed(p.goalAdjustmentKcal)} kcal`} />
        <View style={styles.divider} />
        <Row label="Daily target" value={`${p.dailyTargetKcal.toLocaleString()} kcal`} emphasis />
      </Card>
    </OnboardingStep>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={emphasis ? "body" : "caption"} color={emphasis ? "dark" : "muted"}>
        {label}
      </Text>
      <Text variant={emphasis ? "body" : "caption"} color={emphasis ? "primary" : "dark"}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.xs },
  cardTitle: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.gray[200], marginVertical: spacing.xs },
});
