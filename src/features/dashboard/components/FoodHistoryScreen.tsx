import { router } from "expo-router";
import { Lock } from "phosphor-react-native";
import { View } from "react-native";
import { Button, Card, ErrorState, LoadingState, Text } from "@/components";
import type { HistoryDay as HistoryDayModel } from "@/contracts";
import { colors } from "@/theme";
import { useFoodLogHistory } from "../hooks/useDashboard";

export function FoodHistoryScreen() {
  const history = useFoodLogHistory();

  if (history.isLoading) {
    return <LoadingState message="Loading food history..." />;
  }

  if (history.isError || !history.data) {
    return (
      <ErrorState
        title="Could not load history"
        message="Your dashboard is still available."
        onRetry={() => void history.refetch()}
      />
    );
  }

  return (
    <View className="gap-lg">
      <Text variant="heading2" color="dark">
        Food history
      </Text>
      {history.data.days.length === 0 ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            Nothing logged yet
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your meals will appear here after you start logging.
          </Text>
        </Card>
      ) : (
        history.data.days.map((day) =>
          day.isLocked ? (
            <LockedHistoryDay key={day.day} day={day.day} />
          ) : (
            <HistoryDay key={day.day} day={day} />
          )
        )
      )}
    </View>
  );
}

function HistoryDay({ day }: { day: HistoryDayModel }) {
  return (
    <View className="gap-md">
      <Text variant="heading3" color="dark">
        {day.day}
      </Text>
      {day.entries.map((entry) => (
        <View key={entry.id} className="flex-row justify-between gap-md border-b border-gray-200 pb-sm">
          <View className="flex-1">
            <Text variant="body" color="dark">
              {entry.name}
            </Text>
            <Text variant="caption" color="muted">
              {new Date(entry.consumedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Text variant="body" color="dark">
            {entry.nutrients.calories} kcal
          </Text>
        </View>
      ))}
    </View>
  );
}

function LockedHistoryDay({ day }: { day: string }) {
  return (
    <View className="gap-sm">
      <Text variant="heading3" color="dark">
        {day}{" "}
        <Text variant="body" className="font-semibold text-accent">
          History locked
        </Text>
      </Text>
      <Card className="items-center gap-sm bg-gray-100">
        <Lock size={28} color={colors.gray[500]} weight="regular" />
        <Text variant="heading3" color="dark" className="text-center">
          Subscribe to see your full history
        </Text>
        <Text variant="body" color="muted" className="text-center">
          Your streak is safe.
        </Text>
        <Button label="View plans" onPress={() => router.push("/(app)/settings/subscription")} />
      </Card>
    </View>
  );
}
