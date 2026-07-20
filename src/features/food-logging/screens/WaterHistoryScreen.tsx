import { useCallback, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import {
  Card,
  FilterChips,
  PageHeader,
  PremiumGate,
  SectionError,
  SelectInput,
  SelectSheet,
  SkeletonText,
  Text,
  type FilterChip,
} from "@/components";
import type {
  ChartPeriod,
  HistorySort,
  MealTime,
  WaterEntry,
  WaterHistoryResponse,
} from "@/contracts";
import { MEAL_TIME_WINDOWS } from "@/contracts";
import { useSettings } from "@/features/settings";
import { localDay, formatWater } from "@/utils";
import type { WaterHistoryFilters } from "../api/food-logging.api";
import { useWaterHistory } from "../hooks/useFoodLogging";
import { colors } from "@/theme";

export interface WaterHistoryScreenProps {
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
  { label: "Highest amount", value: "highest" },
  { label: "Lowest amount", value: "lowest" },
];

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

function formatMealTimeOption(key: MealTime): string {
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  const { startHour, endHour } = MEAL_TIME_WINDOWS[key];
  const endDisplay = endHour === 4 ? "3:59 AM" : `${formatHour(endHour - 1).replace(":00", ":59")}`;
  return `${label} · ${formatHour(startHour)} – ${endDisplay}`;
}

const mealTimeOptions: readonly { label: string; value: MealTime }[] = (
  ["morning", "afternoon", "evening", "night"] as MealTime[]
).map((key) => ({ label: formatMealTimeOption(key), value: key }));

type WaterHistory = WaterHistoryResponse["history"];

type HistoryListItem =
  | { type: "header"; day: string; totalMl: number }
  | { type: "entry"; entry: WaterEntry }
  | { type: "locked"; historyLimitDays: number }
  | { type: "footer-spinner" }
  | { type: "footer-end" };

function buildListItems(
  pages: WaterHistory[] | undefined,
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
        items.push({ type: "header", day: day.day, totalMl: day.totalMl });
      }
      for (const entry of day.entries) {
        items.push({ type: "entry", entry });
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
  return `header-${item.day}`;
}

function getItemType(item: HistoryListItem): string {
  return item.type;
}

export function WaterHistoryScreen({ refreshing, onRefresh }: WaterHistoryScreenProps) {
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [mealTimeSheetOpen, setMealTimeSheetOpen] = useState(false);
  const [sort, setSort] = useState<HistorySort>("newest");
  const [mealTime, setMealTime] = useState<MealTime | undefined>(undefined);
  const settings = useSettings();
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const flashListRef = useRef<FlashListRef<HistoryListItem>>(null);

  const filters: WaterHistoryFilters = useMemo(
    () => ({
      mealTime,
      sort: sort !== "newest" ? sort : undefined,
    }),
    [mealTime, sort]
  );

  const history = useWaterHistory(period, localDay(), filters);

  const suppressDateHeaders = sort === "highest" || sort === "lowest";
  const listItems = useMemo(
    () =>
      buildListItems(
        history.data?.pages.map((p) => p),
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
    (update: Partial<{ sort: HistorySort; mealTime: MealTime | undefined }>) => {
      if (update.sort !== undefined) setSort(update.sort);
      if ("mealTime" in update) setMealTime(update.mealTime);
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
    return chips;
  }, [sort, mealTime, selectedSortLabel, selectedMealTimeLabel, handleFilterChange]);

  const renderItem = useCallback<ListRenderItem<HistoryListItem>>(
    ({ item }) => {
      if (item.type === "locked") {
        return <LockedEarlierHistory historyLimitDays={item.historyLimitDays} />;
      }
      if (item.type === "header") {
        return <HistoryDayHeader day={item.day} totalMl={item.totalMl} unitSystem={unitSystem} />;
      }
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
      return <WaterHistoryEntryRow entry={item.entry} unitSystem={unitSystem} />;
    },
    [unitSystem]
  );

  const isLoading = history.isLoading;
  const isError = history.isError && !history.data;
  const isEmpty = !isLoading && !isError && listItems.length === 0 && !history.isFetchingNextPage;
  const hasFiltersActive = !!mealTime || sort !== "newest";

  return (
    <View className="flex-1 gap-lg">
      <PageHeader title="Water history" subtitle="Review your hydration logs over time." />

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

      <SelectInput
        label="Meal time"
        value={selectedMealTimeLabel ?? "Any time"}
        onPress={() => setMealTimeSheetOpen(true)}
      />

      <FilterChips chips={filterChips} />

      {isLoading ? <HistorySkeleton /> : null}
      {isError ? (
        <SectionError
          title="Could not load water history"
          message="Your hydration log is still available for today."
          onRetry={() => void history.refetch()}
        />
      ) : null}
      {isEmpty && hasFiltersActive ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            No results
          </Text>
          <Text variant="body" color="muted" className="text-center">
            No water logs match your current filters.
          </Text>
        </Card>
      ) : isEmpty ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            No water logged
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your water logs will appear here after you start logging in this period.
          </Text>
        </Card>
      ) : null}
      {!isLoading && !isError && listItems.length > 0 ? (
        <FlashList
          ref={flashListRef}
          style={{ flex: 1 }}
          data={listItems}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-sm" />}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          stickyHeaderIndices={stickyHeaderIndices}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : null}

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

function HistoryDayHeader({
  day,
  totalMl,
  unitSystem,
}: {
  day: string;
  totalMl: number;
  unitSystem: "metric" | "imperial";
}) {
  return (
    <View className="flex-row items-center justify-between bg-white pb-sm pt-lg">
      <Text variant="heading3" color="dark">
        {formatHistoryDay(day)}
      </Text>
      <Text variant="body" color="muted">
        {formatWater(totalMl, unitSystem)}
      </Text>
    </View>
  );
}

function WaterHistoryEntryRow({
  entry,
  unitSystem,
}: {
  entry: WaterEntry;
  unitSystem: "metric" | "imperial";
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-sm">
      <View>
        <Text variant="body" color="dark">
          Glass of water
        </Text>
        <Text variant="caption" color="muted">
          {formatTime(entry.recordedAt)}
        </Text>
      </View>
      <Text variant="body" color="dark">
        {formatWater(entry.amountMl, unitSystem)}
      </Text>
    </View>
  );
}

function LockedEarlierHistory({ historyLimitDays }: { historyLimitDays: number }) {
  return (
    <View className="gap-sm py-md">
      <Text variant="heading3" color="dark">
        Earlier history
      </Text>
      <PremiumGate
        title="Subscribe to see older water logs"
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
                  Glass of water
                </Text>
                <Text variant="caption" color="muted">
                  --:--
                </Text>
              </View>
              <Text variant="body" color="dark">
                -- ml
              </Text>
            </View>
          ))}
        </Card>
      </PremiumGate>
    </View>
  );
}

function formatHistoryDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
