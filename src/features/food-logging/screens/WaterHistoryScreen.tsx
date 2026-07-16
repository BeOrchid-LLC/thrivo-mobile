import { useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import {
  Card,
  PageHeader,
  PremiumGate,
  SectionError,
  SelectInput,
  SelectSheet,
  SkeletonText,
  Text,
} from "@/components";
import type { ChartPeriod, WaterEntry, WaterHistoryResponse } from "@/contracts";
import { useSettings } from "@/features/settings";
import { localDay, formatWater } from "@/utils";
import { useWaterHistory } from "../hooks/useFoodLogging";

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

type WaterHistory = WaterHistoryResponse["history"];

type HistoryListItem =
  | { type: "header"; day: string; totalMl: number }
  | { type: "entry"; entry: WaterEntry }
  | { type: "locked"; historyLimitDays: number };

function buildListItems(history: WaterHistory | undefined): HistoryListItem[] {
  if (!history) return [];

  const items: HistoryListItem[] = [];
  for (const day of history.days) {
    items.push({ type: "header", day: day.day, totalMl: day.totalMl });
    for (const entry of day.entries) {
      items.push({ type: "entry", entry });
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
  return `header-${item.day}`;
}

function getItemType(item: HistoryListItem): string {
  return item.type;
}

export function WaterHistoryScreen({ refreshing, onRefresh }: WaterHistoryScreenProps) {
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const settings = useSettings();
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const history = useWaterHistory(period, localDay());
  const selectedPeriodLabel =
    periodOptions.find((option) => option.value === period)?.label ?? "Select period";

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
      if (item.type === "header") {
        return <HistoryDayHeader day={item.day} totalMl={item.totalMl} unitSystem={unitSystem} />;
      }
      return <WaterHistoryEntryRow entry={item.entry} unitSystem={unitSystem} />;
    },
    [unitSystem]
  );

  return (
    <View className="flex-1 gap-lg">
      <PageHeader title="Water history" subtitle="Review your hydration logs over time." />

      <SelectInput
        label="Time period"
        value={selectedPeriodLabel}
        onPress={() => setPeriodSheetOpen(true)}
      />

      {history.isLoading ? <HistorySkeleton /> : null}
      {history.isError && !history.data ? (
        <SectionError
          title="Could not load water history"
          message="Your hydration log is still available for today."
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
            No water logged
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Your water logs will appear here after you start logging in this period.
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
    <View className="flex-row items-center justify-between bg-white pb-sm pt-md">
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
