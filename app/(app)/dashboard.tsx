import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Flame, Lock, Plus } from "phosphor-react-native";
import { Button, Card, CalorieRing, Screen, Segmented, Text } from "@/components";
import { colors, radii, spacing } from "@/theme";
import type { MealType } from "@/contracts";
import { useDemoEntries, useDemoProfile, useDemoProfileActions } from "@/stores";
import { MacroBars } from "@/features/dashboard/components/MacroBars";

type Tier = "personalized" | "free";

/** Free tier dashboards against a flat 2,000 kcal default (DECISION_LOG). */
const FREE_TARGET_KCAL = 2000;

const MEALS: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const todayLabel = (): string => {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

/** Tier-gated home (Figma dashboard). Personalized shows the onboarding target +
 *  macros + streak; free dashboards against 2,000 kcal with macros/streak locked. */
export default function Dashboard() {
  const profile = useDemoProfile();
  const entries = useDemoEntries();
  const { addQuickEntry } = useDemoProfileActions();
  const [tier, setTier] = useState<Tier>("personalized");

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          proteinG: acc.proteinG + e.proteinG,
          carbsG: acc.carbsG + e.carbsG,
          fatG: acc.fatG + e.fatG,
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
      ),
    [entries]
  );

  // Profile is seeded on onboarding completion; this is a safety net only.
  if (!profile) {
    return (
      <Screen>
        <Text variant="body" color="muted">
          Finish onboarding to see your dashboard.
        </Text>
      </Screen>
    );
  }

  const isPremium = tier === "personalized";
  const target = isPremium ? profile.dailyTargetKcal : FREE_TARGET_KCAL;
  const remaining = Math.max(target - totals.calories, 0);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text variant="heading2" color="dark">
            Today
          </Text>
          <Text variant="body" color="muted">
            {todayLabel()}
          </Text>
        </View>
      </View>

      <Segmented<Tier>
        style={styles.tier}
        options={[
          { label: "Personalized", value: "personalized" },
          { label: "Free", value: "free" },
        ]}
        value={tier}
        onChange={setTier}
      />

      <Card style={styles.calorieCard}>
        <CalorieRing consumed={totals.calories} target={target} />
        <View style={styles.calorieNumbers}>
          <Text variant="heading1" color="dark">
            {totals.calories.toLocaleString()}
          </Text>
          <Text variant="body" color="muted">
            of {target.toLocaleString()} kcal
          </Text>
          <Text variant="body" color="primary">
            {remaining.toLocaleString()} remaining
          </Text>
        </View>
      </Card>

      {isPremium ? (
        <>
          <Card>
            <MacroBars consumed={totals} target={profile.macroTargets} />
          </Card>
          <View style={styles.streak}>
            <Flame size={20} color={colors.accent} weight="fill" />
            <Text variant="body" color="dark" style={styles.streakText}>
              {profile.streakDays}-day streak — keep it up!
            </Text>
          </View>
        </>
      ) : (
        <Card style={styles.locked}>
          <Lock size={24} color={colors.gray[500]} />
          <Text variant="heading3" color="dark">
            Macros & streak are Premium
          </Text>
          <Text variant="caption" color="muted" style={styles.lockedText}>
            Unlock your personalized target, protein/carbs/fat, and your streak.
          </Text>
          <Button label="Unlock Premium" onPress={() => setTier("personalized")} />
        </Card>
      )}

      <View style={styles.meals}>
        {MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal.key);
          const subtotal = items.reduce((sum, e) => sum + e.calories, 0);
          return (
            <Card key={meal.key}>
              <View style={styles.mealHeader}>
                <Text variant="heading3" color="dark">
                  {meal.label}
                </Text>
                <Text variant="caption" color="muted">
                  {subtotal} kcal
                </Text>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.item}>
                  <Text variant="body" color="dark" style={styles.itemName}>
                    {item.name}
                  </Text>
                  <Text variant="body" color="muted">
                    {item.calories} kcal
                  </Text>
                </View>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={() => addQuickEntry(meal.key)}
                style={styles.addRow}
              >
                <Plus size={18} color={colors.primary} weight="bold" />
                <Text variant="body" color="primary">
                  Add food
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: spacing.lg },
  tier: { marginBottom: spacing.lg },
  calorieCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  calorieNumbers: { flex: 1, gap: spacing.xs },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  streakText: { flex: 1 },
  locked: { alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  lockedText: { textAlign: "center" },
  meals: { gap: spacing.md, marginTop: spacing.lg },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  itemName: { flex: 1 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
});
