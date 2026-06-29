import { router } from "expo-router";
import { Lock } from "phosphor-react-native";
import { View } from "react-native";
import { Button, Card, SectionError, SkeletonText, Text } from "@/components";
import type { HistoryDay as HistoryDayModel } from "@/contracts";
import { colors } from "@/theme";
import { useFoodLogHistory } from "../hooks/useDashboard";

export function FoodHistoryScreen() {
  const history = useFoodLogHistory();
  const days = history.data?.days ?? [];

  return (
    <View className="gap-lg">
      <Text variant="heading2" color="dark">
        Food history
      </Text>
      {history.isLoading ? <HistorySkeleton /> : null}
      {history.isError && !history.data ? (
        <SectionError
          title="Could not load history"
          message="Your dashboard is still available."
          onRetry={() => void history.refetch()}
        />
      ) : null}
      {history.isFetching && history.data ? (
        <Text variant="caption" color="muted">
          Refreshing history...
        </Text>
      ) : null}
      {!history.isLoading && !history.isError && days.length === 0 ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            Nothing logged yet
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your meals will appear here after you start logging.
          </Text>
        </Card>
      ) : (
        days.map((day) =>
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

function HistorySkeleton() {
  return (
    <View className="gap-lg">
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} className="gap-md">
          <SkeletonText size="heading" className="w-1/3" />
          <View className="gap-sm">
            <SkeletonText className="w-2/3" />
            <SkeletonText size="caption" className="w-1/4" />
          </View>
        </View>
      ))}
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
        <View
          key={entry.id}
          className="flex-row justify-between gap-md border-b border-gray-200 pb-sm"
        >
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
