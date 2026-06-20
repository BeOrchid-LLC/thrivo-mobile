import { router } from "expo-router";
import { View } from "react-native";
import { Drop, ForkKnife } from "phosphor-react-native";
import { Button, Card, CalorieRing, ErrorState, LoadingState, Screen, Text } from "@/components";
import { useMe } from "@/features/profile";
import { MacroBars } from "@/features/dashboard/components/MacroBars";
import { deriveMacroTargets } from "@/features/onboarding/utils/tdee";
import { colors } from "@/theme";

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
      <View className="gap-lg">
        <View className="mb-xs">
          <Text variant="heading2" color="dark">
            Hi, {profile.name || "there"}
          </Text>
          <Text variant="body" color="muted">
            {todayLabel()}
          </Text>
        </View>

        <Card className="flex-row items-center gap-lg">
          <CalorieRing consumed={zeroTotals.calories} target={target} />
          <View className="flex-1 gap-xs">
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

        <Card className="flex-row items-center gap-md">
          <View className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-gray-100">
            <Drop size={22} color={colors.primary} weight="fill" />
          </View>
          <View className="flex-1 gap-xs">
            <Text variant="heading3" color="dark">
              Water
            </Text>
            <Text variant="body" color="muted">
              0 of 8 cups today
            </Text>
          </View>
        </Card>

        <Card className="items-center gap-md">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-pill bg-primary">
            <ForkKnife size={24} color={colors.white} weight="bold" />
          </View>
          <Text variant="heading3" color="dark" className="text-center">
            Your food log is empty
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Add your first meal to start tracking calories and macros for today.
          </Text>
          <Button label="Log first meal" onPress={() => router.push("/(app)/log")} />
        </Card>
      </View>
    </Screen>
  );
}
