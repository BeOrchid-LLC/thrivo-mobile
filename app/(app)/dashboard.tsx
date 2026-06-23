import { router } from "expo-router";
import { View } from "react-native";
import { ForkKnife } from "phosphor-react-native";
import { Button, Card, CalorieRing, ErrorState, LoadingState, Screen, Text } from "@/components";
import { useMe } from "@/features/profile";
import {
  MacroBars,
  MealLog,
  StreakBanner,
  WaterTracker,
  useAddWater,
  useDashboard,
  useTodayFoodLog,
} from "@/features/dashboard";
import { deriveMacroTargets } from "@/features/onboarding/utils/tdee";
import { colors } from "@/theme";
import type { MealType } from "@/contracts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GLASS_ML = 250;

const todayLabel = (): string => {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export default function Dashboard() {
  const me = useMe();
  const dashboard = useDashboard();
  const foodLog = useTodayFoodLog();
  const addWater = useAddWater();

  if (me.isLoading || dashboard.isLoading) {
    return (
      <Screen>
        <LoadingState message="Loading your dashboard..." />
      </Screen>
    );
  }

  if (me.isError || dashboard.isError || !me.data || !dashboard.data) {
    return (
      <Screen>
        <ErrorState
          title="Could not load your dashboard"
          message="Please try again."
          onRetry={() => {
            void me.refetch();
            void dashboard.refetch();
          }}
        />
      </Screen>
    );
  }

  const { consumed, targetCalories, streakDays, waterMl } = dashboard.data;
  const entries = foodLog.data ?? [];
  const remaining = Math.max(targetCalories - consumed.calories, 0);
  const glasses = Math.round((waterMl ?? 0) / GLASS_ML);
  const macroTarget =
    dashboard.data.targetProteinG && dashboard.data.targetCarbsG && dashboard.data.targetFatG
      ? {
          proteinG: dashboard.data.targetProteinG,
          carbsG: dashboard.data.targetCarbsG,
          fatG: dashboard.data.targetFatG,
        }
      : deriveMacroTargets(targetCalories);

  // The meal is reserved for when the log screen accepts a preselected meal;
  // for now every entry point opens the log tab.
  const goToLog = (_meal?: MealType) => router.push("/(app)/log");

  return (
    <Screen scroll>
      <View className="gap-lg">
        <View className="mb-xs">
          <Text variant="heading2" color="dark">
            Hi, {me.data.name || "there"}
          </Text>
          <Text variant="body" color="muted">
            {todayLabel()}
          </Text>
        </View>

        <Card className="flex-row items-center gap-lg">
          <CalorieRing
            consumed={consumed.calories}
            target={targetCalories}
            emptyLabel="Log your first meal"
          />
          <View className="flex-1 gap-xs">
            <Text variant="heading1" color="dark">
              {consumed.calories.toLocaleString()}
            </Text>
            <Text variant="body" color="muted">
              of {targetCalories.toLocaleString()} daily target
            </Text>
            <Text variant="body" color="primary">
              {remaining.toLocaleString()} remaining
            </Text>
          </View>
        </Card>

        <Card>
          <MacroBars
            consumed={{
              proteinG: consumed.proteinG,
              carbsG: consumed.carbsG,
              fatG: consumed.fatG,
            }}
            target={macroTarget}
          />
        </Card>

        {streakDays && streakDays > 0 ? <StreakBanner days={streakDays} /> : null}

        <WaterTracker
          glasses={glasses}
          adding={addWater.isPending}
          error={addWater.error?.message ?? null}
          onAdd={() => addWater.mutate()}
        />

        {entries.length > 0 ? (
          <MealLog entries={entries} onLogFood={goToLog} />
        ) : (
          <Card className="items-center gap-md">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-primarySoft">
              <ForkKnife size={28} color={colors.primary} weight="regular" />
            </View>
            <Text variant="heading3" color="dark" className="text-center">
              Nothing logged yet
            </Text>
            <Text variant="body" color="muted" className="text-center">
              Scan a barcode, search the database or describe what you ate to get started.
            </Text>
            <Button label="Log first meal" onPress={() => goToLog()} />
          </Card>
        )}
      </View>
    </Screen>
  );
}
