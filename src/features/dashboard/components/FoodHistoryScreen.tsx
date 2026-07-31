import { memo, useCallback, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { Heart } from "phosphor-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import {
  Card,
  FilterChips,
  HistorySkeleton,
  PageHeader,
  PremiumGate,
  SearchBar,
  SectionError,
  SelectInput,
  SelectSheet,
  Text,
  type FilterChip,
} from "@/components";
import type {
  ChartPeriod,
  FoodLogEntry,
  FoodLogHistoryResponse,
  HistorySort,
  MealTime,
} from "@/contracts";
import { MEAL_TIME_WINDOWS } from "@/contracts";
import { EditFoodLogSheet, useFavorites } from "@/features/food-logging";
import { FavoriteButton } from "@/features/food-logging/components/FavoriteButton";
import { useDebouncedValue } from "@/hooks";
import { colors } from "@/theme";
import type { FoodLogHistoryFilters } from "../api/dashboard.api";
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

const sortOptions: readonly { label: string; value: HistorySort }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Highest kcal", value: "highest" },
  { label: "Lowest kcal", value: "lowest" },
];

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function formatMealTimeOption(key: MealTime): string {
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  const { startHour, endHour } = MEAL_TIME_WINDOWS[key];
  // endHour is exclusive: 11 means up to 10:59
  const endDisplay = endHour === 4 ? "3:59 AM" : `${formatHour(endHour - 1).replace(":00", ":59")}`;
  return `${label} · ${formatHour(startHour)} – ${endDisplay}`;
}

const mealTimeOptions: readonly { label: string; value: MealTime }[] = (
  ["morning", "afternoon", "evening", "night"] as MealTime[]
).map((key) => ({ label: formatMealTimeOption(key), value: key }));

type HistoryListItem =
  | { type: "header"; day: string }
  | { type: "locked"; historyLimitDays: number }
  | { type: "entry"; day: string; entry: FoodLogEntry }
  | { type: "footer-spinner" }
  | { type: "footer-end" };

function buildListItems(
  pages: FoodLogHistoryResponse[] | undefined,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  suppressDateHeaders: boolean
): HistoryListItem[] {
  if (!pages || pages.length === 0) return [];
  const items: HistoryListItem[] = [];
  const seenDays = new Set<string>();

  for (const page of pages) {
    for (const day of page.days) {
      if (!suppressDateHeaders && !seenDays.has(day.day)) {
        seenDays.add(day.day);
        items.push({ type: "header", day: day.day });
      }
      for (const entry of day.entries) {
        items.push({ type: "entry", day: day.day, entry });
      }
    }
    if (page.lockedRange) {
      items.push({ type: "locked", historyLimitDays: page.historyLimitDays });
    }
  }

  if (isFetchingNextPage) {
    items.push({ type: "footer-spinner" });
  } else if (!hasNextPage && items.length > 0) {
    items.push({ type: "footer-end" });
  }

  return items;
}

function keyExtractor(item: HistoryListItem): string {
  if (item.type === "entry") return `entry-${item.entry.id}`;
  if (item.type === "locked") return "locked-earlier-history";
  if (item.type === "footer-spinner") return "footer-spinner";
  if (item.type === "footer-end") return "footer-end";
  return `${item.type}-${item.day}`;
}

function getItemType(item: HistoryListItem): string {
  return item.type;
}

export function FoodHistoryScreen({ refreshing, onRefresh }: FoodHistoryScreenProps) {
  useFavorites();
  const [period, setPeriod] = useState<ChartPeriod>("1m");
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [mealTimeSheetOpen, setMealTimeSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<HistorySort>("newest");
  const [mealTime, setMealTime] = useState<MealTime | undefined>(undefined);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(searchText, 350);
  const flashListRef = useRef<FlashListRef<HistoryListItem>>(null);

  const filters: FoodLogHistoryFilters = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      mealTime,
      favoritesOnly: favoritesOnly || undefined,
      sort: sort !== "newest" ? sort : undefined,
    }),
    [debouncedSearch, mealTime, favoritesOnly, sort]
  );

  const history = useFoodLogHistory(period, undefined, filters);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);

  const suppressDateHeaders = sort === "highest" || sort === "lowest";
  const listItems = useMemo(
    () =>
      buildListItems(
        history.data?.pages,
        history.hasNextPage,
        history.isFetchingNextPage,
        suppressDateHeaders
      ),
    [history.data?.pages, history.hasNextPage, history.isFetchingNextPage, suppressDateHeaders]
  );

  const stickyHeaderIndices = useMemo(
    () =>
      suppressDateHeaders
        ? []
        : listItems.reduce<number[]>((acc, item, index) => {
            if (item.type === "header") acc.push(index);
            return acc;
          }, []),
    [listItems, suppressDateHeaders]
  );

  const handleEndReached = useCallback(() => {
    if (history.hasNextPage && !history.isFetchingNextPage) {
      void history.fetchNextPage();
    }
  }, [history]);

  const handleFilterChange = useCallback(
    (
      update: Partial<{ sort: HistorySort; mealTime: MealTime | undefined; favoritesOnly: boolean }>
    ) => {
      if (update.sort !== undefined) setSort(update.sort);
      if ("mealTime" in update) setMealTime(update.mealTime);
      if (update.favoritesOnly !== undefined) setFavoritesOnly(update.favoritesOnly);
      flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    []
  );

  const selectedPeriodLabel =
    periodOptions.find((o) => o.value === period)?.label ?? "Select period";
  const selectedSortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "Newest first";
  const selectedMealTimeLabel = mealTime
    ? mealTimeOptions.find((o) => o.value === mealTime)?.label
    : undefined;

  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    if (sort !== "newest")
      chips.push({
        key: "sort",
        label: selectedSortLabel,
        onRemove: () => handleFilterChange({ sort: "newest" }),
      });
    if (mealTime)
      chips.push({
        key: "mealTime",
        label: selectedMealTimeLabel ?? mealTime,
        onRemove: () => handleFilterChange({ mealTime: undefined }),
      });
    if (favoritesOnly)
      chips.push({
        key: "favorites",
        label: "Favorites only",
        onRemove: () => handleFilterChange({ favoritesOnly: false }),
      });
    return chips;
  }, [sort, mealTime, favoritesOnly, selectedSortLabel, selectedMealTimeLabel, handleFilterChange]);

  const renderItem = useCallback<ListRenderItem<HistoryListItem>>(({ item }) => {
    if (item.type === "locked") {
      return <LockedEarlierHistory historyLimitDays={item.historyLimitDays} />;
    }
    if (item.type === "header") return <HistoryDayHeader day={item.day} />;
    if (item.type === "footer-spinner") {
      return (
        <View className="items-center py-md">
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (item.type === "footer-end") {
      return (
        <View className="items-center py-md">
          <Text variant="caption" color="muted">
            All caught up
          </Text>
        </View>
      );
    }
    return <HistoryEntryRow entry={item.entry} onPress={() => setEditingEntry(item.entry)} />;
  }, []);

  const handleRefresh = useCallback(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
    onRefresh?.();
  }, [onRefresh]);

  const isLoading = history.isLoading;
  const isError = history.isError && !history.data;
  const isEmpty = !isLoading && !isError && listItems.length === 0 && !history.isFetchingNextPage;
  const hasFiltersActive =
    !!debouncedSearch.trim() || !!mealTime || favoritesOnly || sort !== "newest";

  return (
    <View className="flex-1 gap-lg">
      <PageHeader title="Food history" showBack={false} />

      <SearchBar
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);
          flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        placeholder="Search foods…"
      />

      <View className="flex-row gap-sm">
        <View className="flex-1">
          <SelectInput
            label="Period"
            value={selectedPeriodLabel}
            onPress={() => setPeriodSheetOpen(true)}
          />
        </View>
        <View className="flex-1">
          <SelectInput
            label="Sort"
            value={selectedSortLabel}
            onPress={() => setSortSheetOpen(true)}
          />
        </View>
      </View>

      <View className="flex-row gap-sm">
        <SelectInput
          label="Meal time"
          value={selectedMealTimeLabel ?? "Any time"}
          onPress={() => setMealTimeSheetOpen(true)}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Favorites only"
          accessibilityState={{ checked: favoritesOnly }}
          onPress={() => handleFilterChange({ favoritesOnly: !favoritesOnly })}
          className={`min-h-[48px] flex-1 flex-row items-center justify-center rounded-md border px-md ${
            favoritesOnly ? "border-primary bg-primarySoft" : "border-gray-300 bg-white"
          }`}
        >
          <Heart
            size={16}
            color={favoritesOnly ? colors.primary : colors.gray[500]}
            weight={favoritesOnly ? "fill" : "regular"}
          />
          <Text
            variant="caption"
            color={favoritesOnly ? "primary" : "muted"}
            className="ml-xs font-medium"
          >
            Favorites
          </Text>
        </Pressable>
      </View>

      <FilterChips chips={filterChips} />

      {isLoading ? <HistorySkeleton /> : null}
      {isError ? (
        <SectionError
          title="Could not load history"
          message="Your dashboard is still available."
          onRetry={() => void history.refetch()}
        />
      ) : null}
      {isEmpty && hasFiltersActive ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            No results
          </Text>
          <Text variant="body" color="muted" className="text-center">
            No logs match your current filters.
          </Text>
        </Card>
      ) : isEmpty ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            Nothing logged yet
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your meals will appear here after you start logging.
          </Text>
        </Card>
      ) : null}
      {!isLoading && !isError && listItems.length > 0 ? (
        <FlashList
          ref={flashListRef}
          style={{ flex: 1 }}
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          stickyHeaderIndices={stickyHeaderIndices}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : null}

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
        onChange={(v) => {
          setPeriod(v);
          flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        onClose={() => setPeriodSheetOpen(false)}
      />
      <SelectSheet
        title="Sort by"
        options={sortOptions}
        value={sort}
        visible={sortSheetOpen}
        onChange={(v) => handleFilterChange({ sort: v })}
        onClose={() => setSortSheetOpen(false)}
      />
      <SelectSheet
        title="Meal time"
        options={mealTimeOptions}
        value={mealTime ?? ""}
        visible={mealTimeSheetOpen}
        onChange={(v) => handleFilterChange({ mealTime: v as MealTime })}
        onClose={() => setMealTimeSheetOpen(false)}
      />
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
  onPress,
}: {
  entry: FoodLogEntry;
  onPress: () => void;
}) {
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
        {entry.foodItemId ? <FavoriteButton foodItemId={entry.foodItemId} size={20} /> : null}
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
