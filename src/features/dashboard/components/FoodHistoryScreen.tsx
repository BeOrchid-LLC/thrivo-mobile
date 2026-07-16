import { memo, useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import { Heart } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import {
  Card,
  PremiumGate,
  SectionError,
  SelectInput,
  SelectSheet,
  SkeletonText,
  Text,
} from "@/components";
import type { ChartPeriod, FoodLogEntry, FoodLogHistoryResponse } from "@/contracts";
import { EditFoodLogSheet, useFavorites, useToggleFavorite } from "@/features/food-logging";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import { useFoodLogHistory } from "../hooks/useDashboard";

export interface FoodHistoryScreenProps {
  refreshing?: boolean;
  onRefresh?: () => void;
}

const periodOptions: readonly { label: string; value: ChartPeriod }[] = [
  { label: "Week", value: "7d" },
  { label: "2 weeks", value: "14d" },
  { label: "Month", value: "1m" },
  { label: "Quarter", value: "1q" },
  { label: "6 months", value: "6m" },
  { label: "Year", value: "1y" },
  { label: "All time", value: "all" },
];

type HistoryListItem =
  | { type: "header"; day: string }
  | { type: "locked"; historyLimitDays: number }
  | { type: "entry"; day: string; entry: FoodLogEntry };

function buildListItems(history: FoodLogHistoryResponse | undefined): HistoryListItem[] {
  if (!history) return [];
  const items: HistoryListItem[] = [];
  for (const day of history.days) {
    items.push({ type: "header", day: day.day });
    for (const entry of day.entries) {
      items.push({ type: "entry", day: day.day, entry });
    }
  }
  if (history.lockedRange) {
    items.push({ type: "locked", historyLimitDays: history.historyLimitDays });
  }
  return items;
}

function keyExtractor(item: HistoryListItem): string {
  if (item.type === "entry") return `entry-${item.entry.id}`;
  if (item.type === "locked") return "locked-earlier-history";
  return `${item.type}-${item.day}`;
}

function getItemType(item: HistoryListItem): string {
  return item.type;
}

export function FoodHistoryScreen({ refreshing, onRefresh }: FoodHistoryScreenProps) {
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const history = useFoodLogHistory(period);
  useFavorites(); // fetch + sync the local favorites store ONCE per screen, not per row (R6 I20)
  const toggleFavorite = useToggleFavorite();
  const selectedPeriodLabel =
    periodOptions.find((option) => option.value === period)?.label ?? "Select period";
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const listItems = useMemo(() => buildListItems(history.data), [history.data]);
  const stickyHeaderIndices = useMemo(
    () =>
      listItems.reduce<number[]>((acc, item, index) => {
        if (item.type === "header") acc.push(index);
        return acc;
      }, []),
    [listItems]
  );

  const renderItem = useCallback<ListRenderItem<HistoryListItem>>(
    ({ item }) => {
      if (item.type === "locked") {
        return <LockedEarlierHistory historyLimitDays={item.historyLimitDays} />;
      }
      if (item.type === "header") return <HistoryDayHeader day={item.day} />;
      return (
        <HistoryEntryRow
          entry={item.entry}
          toggleFavorite={toggleFavorite}
          onPress={() => setEditingEntry(item.entry)}
        />
      );
    },
    [toggleFavorite]
  );

  return (
    <View className="flex-1 gap-lg">
      <Text variant="heading2" color="dark">
        Food history
      </Text>
      <SelectInput
        label="Time period"
        value={selectedPeriodLabel}
        onPress={() => setPeriodSheetOpen(true)}
      />
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
      {!history.isLoading && !history.isError && listItems.length === 0 ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            Nothing logged yet
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your meals will appear here after you start logging.
          </Text>
        </Card>
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          stickyHeaderIndices={stickyHeaderIndices}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      <EditFoodLogSheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
      />
      <SelectSheet
        title="Select period"
        options={periodOptions}
        value={period}
        visible={periodSheetOpen}
        onChange={setPeriod}
        onClose={() => setPeriodSheetOpen(false)}
      />
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

/** Sticky — needs its own background so scrolling entries don't show through underneath it. */
function HistoryDayHeader({ day }: { day: string }) {
  return (
    <View className="bg-white pb-sm pt-md">
      <Text variant="heading3" color="dark">
        {day}
      </Text>
    </View>
  );
}

const HistoryEntryRow = memo(function HistoryEntryRow({
  entry,
  toggleFavorite,
  onPress,
}: {
  entry: FoodLogEntry;
  toggleFavorite: (foodItemId: string) => void;
  onPress: () => void;
}) {
  const isFavorite = useIsFavorite(entry.foodItemId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${entry.name}`}
      onPress={onPress}
      className="flex-row items-center justify-between gap-md border-b border-gray-200 pb-sm"
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
      <View className="flex-row items-center gap-md">
        <Text variant="body" color="dark">
          {entry.nutrients.calories} kcal
        </Text>
        {entry.foodItemId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
            onPress={(event) => {
              event?.stopPropagation?.();
              toggleFavorite(entry.foodItemId as string);
            }}
            hitSlop={8}
          >
            <Heart size={20} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
});

function LockedEarlierHistory({ historyLimitDays }: { historyLimitDays: number }) {
  return (
    <View className="gap-sm py-md">
      <Text variant="heading3" color="dark">
        Earlier history
      </Text>
      <PremiumGate
        title="Subscribe to see your full history"
        subtitle={`Free history includes the most recent ${historyLimitDays} days.`}
        onViewPlans={() => router.push("/(app)/settings/subscription")}
      >
        <Card className="min-h-[190px] gap-md bg-gray-100">
          {Array.from({ length: 3 }).map((_, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between border-b border-gray-200 py-sm"
            >
              <View>
                <Text variant="body" color="dark">
                  Meal log
                </Text>
                <Text variant="caption" color="muted">
                  -- kcal
                </Text>
              </View>
              <Text variant="body" color="dark">
                --:--
              </Text>
            </View>
          ))}
        </Card>
      </PremiumGate>
    </View>
  );
}
