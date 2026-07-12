import { memo, useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import { Heart, Lock } from "phosphor-react-native";
import { Pressable, View } from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Button, Card, SectionError, SkeletonText, Text } from "@/components";
import type { FoodLogEntry, HistoryDay as HistoryDayModel } from "@/contracts";
import { EditFoodLogSheet, useFavorites, useToggleFavorite } from "@/features/food-logging";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import { useFoodLogHistory } from "../hooks/useDashboard";

export interface FoodHistoryScreenProps {
  refreshing?: boolean;
  onRefresh?: () => void;
}

type HistoryListItem =
  | { type: "header"; day: string }
  | { type: "locked"; day: string }
  | { type: "entry"; day: string; entry: FoodLogEntry };

function buildListItems(days: readonly HistoryDayModel[]): HistoryListItem[] {
  const items: HistoryListItem[] = [];
  for (const day of days) {
    if (day.isLocked) {
      items.push({ type: "locked", day: day.day });
      continue;
    }
    items.push({ type: "header", day: day.day });
    for (const entry of day.entries) {
      items.push({ type: "entry", day: day.day, entry });
    }
  }
  return items;
}

function keyExtractor(item: HistoryListItem): string {
  return item.type === "entry" ? `entry-${item.entry.id}` : `${item.type}-${item.day}`;
}

function getItemType(item: HistoryListItem): string {
  return item.type;
}

export function FoodHistoryScreen({ refreshing, onRefresh }: FoodHistoryScreenProps) {
  const history = useFoodLogHistory();
  useFavorites(); // fetch + sync the local favorites store ONCE per screen, not per row (R6 I20)
  const toggleFavorite = useToggleFavorite();
  const days = useMemo(() => history.data?.days ?? [], [history.data]);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const listItems = useMemo(() => buildListItems(days), [days]);
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
      if (item.type === "locked") return <LockedHistoryDay day={item.day} />;
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
        {entry.foodItemId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
            onPress={() => toggleFavorite(entry.foodItemId as string)}
            hitSlop={8}
          >
            <Heart size={20} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
          </Pressable>
        ) : null}
        <Text variant="body" color="dark">
          {entry.nutrients.calories} kcal
        </Text>
      </View>
    </Pressable>
  );
});

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
