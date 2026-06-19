import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Drop, ForkKnife } from "phosphor-react-native";
import { Button, Card, CalorieRing, ErrorState, LoadingState, Screen, Text } from "@/components";
import { useMe } from "@/features/profile";
import { MacroBars } from "@/features/dashboard/components/MacroBars";
import { deriveMacroTargets } from "@/features/onboarding/utils/tdee";
import { colors, radii, spacing } from "@/theme";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const todayLabel = (): string => {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export default function Dashboard() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <Screen>
        <LoadingState message="Loading your dashboard..." />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen>
        <ErrorState
          title="Could not load your dashboard"
          message="Please try again."
          onRetry={() => void me.refetch()}
        />
      </Screen>
    );
  }

  const profile = me.data;
  const target = profile.dailyTargetKcal ?? profile.manualDailyTargetKcal ?? 1800;
  const macroTarget =
    profile.targetProteinG && profile.targetCarbsG && profile.targetFatG
      ? {
          proteinG: profile.targetProteinG,
          carbsG: profile.targetCarbsG,
          fatG: profile.targetFatG,
        }
      : deriveMacroTargets(target);
  const zeroTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="heading2" color="dark">
              Hi, {profile.name || "there"}
            </Text>
            <Text variant="body" color="muted">
              {todayLabel()}
            </Text>
          </View>
        </View>

        <Card style={styles.calorieCard}>
          <CalorieRing consumed={zeroTotals.calories} target={target} />
          <View style={styles.calorieNumbers}>
            <Text variant="heading1" color="dark">
              0
            </Text>
            <Text variant="body" color="muted">
              of {target.toLocaleString()} kcal
            </Text>
            <Text variant="body" color="primary">
              {target.toLocaleString()} remaining
            </Text>
          </View>
        </Card>

        <Card>
          <MacroBars consumed={zeroTotals} target={macroTarget} />
        </Card>

        <Card style={styles.waterCard}>
          <View style={styles.waterIcon}>
            <Drop size={22} color={colors.primary} weight="fill" />
          </View>
          <View style={styles.waterText}>
            <Text variant="heading3" color="dark">
              Water
            </Text>
            <Text variant="body" color="muted">
              0 of 8 cups today
            </Text>
          </View>
        </Card>

        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <ForkKnife size={24} color={colors.white} weight="bold" />
          </View>
          <Text variant="heading3" color="dark" style={styles.centerText}>
            Your food log is empty
          </Text>
          <Text variant="body" color="muted" style={styles.centerText}>
            Add your first meal to start tracking calories and macros for today.
          </Text>
          <Button label="Log first meal" onPress={() => router.push("/(app)/log")} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  headerRow: { marginBottom: spacing.xs },
  calorieCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  calorieNumbers: { flex: 1, gap: spacing.xs },
  waterCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  waterIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  waterText: { flex: 1, gap: spacing.xs },
  emptyCard: { alignItems: "center", gap: spacing.md },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: { textAlign: "center" },
});
