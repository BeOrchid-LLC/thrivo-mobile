import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Dimensions, Pressable, View } from "react-native";
import {
  ChatText,
  Heart,
  MagnifyingGlass,
  NotePencil,
  PlusCircle,
  Scan,
  Warning,
  XCircle,
} from "phosphor-react-native";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Screen,
  SectionError,
  Segmented,
  SkeletonBlock,
  SkeletonText,
  Text,
  useToast,
} from "@/components";
import { queryClient, queryKeys } from "@/api";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { useSettings } from "@/features/settings";
import { colors, spacing } from "@/theme";
import { subscribeTabRootReset } from "@/navigation/tab-root-reset";
import { addDays, formatWater, isToday, roundTo, waterFromMl, waterUnitFor } from "@/utils";
import type { FoodItem, FoodLogEntry, WaterEntry } from "@/contracts";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";
import { FoodResultRow } from "../components/FoodResultRow";
import { FoodRowSkeleton } from "../components/FoodRowSkeleton";
import { LogItemSheet } from "../components/LogItemSheet";
import { SearchResultsSheet } from "../components/SearchResultsSheet";
import { WaterAmountSheet } from "../components/WaterAmountSheet";
import { WaterProgressRing } from "../components/WaterProgressRing";
import {
  useAddWaterLog,
  useDeleteWaterLog,
  useFavorites,
  useFoodSearch,
  useLogFood,
  useRecentFoods,
  useUpdateWaterLog,
  useWater,
} from "../hooks/useFoodLogging";

type Segment = "food" | "water";

/**
 * Fallback top edge for the search-results sheet, used only until the search
 * field reports its real position: the share of the screen the header, quick
 * actions and the field itself take up on a stock phone.
 */
const DEFAULT_SEARCH_FIELD_BOTTOM = Math.round(Dimensions.get("window").height * 0.4);

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

export function LogFoodScreen() {
  const day = useCurrentDay();
  const [segment, setSegment] = useState<Segment>("food");
  const [resetVersion, setResetVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ segment?: string }>();

  useEffect(
    () =>
      subscribeTabRootReset("log", () => {
        setSegment("food");
        setResetVersion((version) => version + 1);
      }),
    []
  );

  // The dashboard water card opens this tab straight on Water. The param is
  // cleared once applied, so arriving here a second time still switches — an
  // effect keyed on an unchanged param would not fire — and so a later tab
  // press lands on Food, the tab's own default.
  useEffect(() => {
    if (params.segment !== "water") return;
    setSegment("water");
    router.setParams({ segment: "" });
  }, [params.segment]);

  const refresh = () => {
    setRefreshing(true);
    const queries =
      segment === "water"
        ? [queryClient.invalidateQueries({ queryKey: queryKeys.metrics.waterByDay(day) })]
        : [
            queryClient.invalidateQueries({ queryKey: queryKeys.foods.recent() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.foods.favorites() }),
            queryClient.invalidateQueries({ queryKey: queryKeys.foods.logDay(day) }),
          ];
    void Promise.all(queries).finally(() => setRefreshing(false));
  };

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      rhythm="default"
      header={
        <PageHeader title="Food Logs" subtitle="What are you having today?" showBack={false} />
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Segmented
        size="large"
        fullWidth
        equalSegments
        value={segment}
        onChange={setSegment}
        options={[
          { label: "Food", value: "food" },
          { label: "Water", value: "water" },
        ]}
      />
      {segment === "food" ? (
        <FoodHome
          key={resetVersion}
          day={day}
          onScan={() => router.push("/(app)/scan-barcode")}
          onDescribe={() => router.push("/(app)/describe-meal")}
          onCreate={() => router.push("/(app)/create-food")}
        />
      ) : (
        <WaterHome day={day} />
      )}
    </Screen>
  );
}

function FoodHome({
  day,
  onScan,
  onDescribe,
  onCreate,
}: {
  day: string;
  onScan: () => void;
  onDescribe: () => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const searchFieldRef = useRef<View>(null);
  // The results sheet hangs off the bottom of the search field, so it needs
  // where that field actually sits — the page scrolls and lifts for the
  // keyboard, so the position is not a constant. Until the first measurement
  // lands (and in test renderers, which do not measure) the sheet falls back to
  // roughly where the field sits on a stock phone.
  const [searchFieldBottom, setSearchFieldBottom] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [loggingItem, setLoggingItem] = useState<FoodItem | null>(null);
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);
  const search = useFoodSearch(debouncedQuery);
  const recent = useRecentFoods();
  const favorites = useFavorites();
  const logFood = useLogFood();
  const { showToast } = useToast();

  const hasQuery = query.trim().length > 0;
  const canSearch = query.trim().length >= 2;
  const results = search.items;
  const favoriteItems = favorites.data?.items ?? [];
  const searchLoading =
    canSearch && (search.isLoading || (results.length === 0 && search.isFetchingNextPage));

  // The recent list is a running feed, so it spans days; the frame heads the
  // newest group "Recent foods" and dates the ones behind it.
  const recentGroups = useMemo(() => {
    const groups: { day: string; entries: FoodLogEntry[] }[] = [];
    for (const entry of recent.data?.items ?? []) {
      const current = groups[groups.length - 1];
      if (current && current.day === entry.day) current.entries.push(entry);
      else groups.push({ day: entry.day, entries: [entry] });
    }
    return groups;
  }, [recent.data?.items]);

  const measureSearchField = useCallback(() => {
    searchFieldRef.current?.measureInWindow((_x, y, _width, height) => {
      if (!Number.isFinite(y) || !Number.isFinite(height)) return;
      setSearchFieldBottom(y + height + spacing.sm);
    });
  }, []);

  useEffect(() => {
    if (hasQuery) measureSearchField();
  }, [hasQuery, measureSearchField]);

  const openLogSheet = (food: FoodItem) => {
    setQuery("");
    setLoggingItem(food);
  };

  // The "+" beside a recent food logs it again onto today, at the same amount.
  const quickAdd = (entry: FoodLogEntry) => {
    if (!entry.foodItemId) return;
    setQuickAddingId(entry.id);
    logFood.mutate(
      {
        foodItemId: entry.foodItemId,
        day,
        servings: entry.servings,
        servingId: entry.servingId ?? undefined,
        servingUnit: entry.servingUnit ?? undefined,
      },
      {
        onSuccess: () => showToast({ message: `${entry.name} logged`, variant: "success" }),
        onError: () => showToast({ message: "Could not log that. Try again.", variant: "error" }),
        onSettled: () => setQuickAddingId(null),
      }
    );
  };

  return (
    <View className="gap-xl">
      <View className="flex-row justify-between">
        <QuickAction
          icon={<Scan size={22} color={colors.dark} />}
          label="Scan barcode"
          onPress={onScan}
        />
        <QuickAction
          icon={<Heart size={22} color={colors.dark} />}
          label="Favorites"
          onPress={() => {
            setQuery("");
            setShowFavoritesOnly(true);
          }}
        />
        <QuickAction
          icon={<ChatText size={22} color={colors.dark} />}
          label="Describe it"
          onPress={onDescribe}
        />
        <QuickAction
          icon={<NotePencil size={22} color={colors.dark} />}
          label="Create food"
          onPress={onCreate}
        />
      </View>
      <View ref={searchFieldRef} collapsable={false} onLayout={measureSearchField}>
        <Input
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setShowFavoritesOnly(false);
          }}
          placeholder="Or, search food by name..."
          autoCapitalize="none"
          shape="pill"
          leadingIcon={<MagnifyingGlass size={20} color={colors.gray[500]} />}
        />
      </View>
      {showFavoritesOnly ? (
        <FoodListSection
          title="Favorites"
          isLoading={favorites.isLoading}
          isError={favorites.isError}
          onRetry={() => void favorites.refetch()}
          emptyTitle="No favorites yet"
          emptyBody="Tap the heart beside a food to save it here."
        >
          {favoriteItems.map((item) => (
            <FoodResultRow
              key={item.id}
              item={item}
              onLog={() => openLogSheet(item)}
              loading={logFood.isPending}
            />
          ))}
        </FoodListSection>
      ) : recentGroups.length > 0 ? (
        <View>
          {recentGroups.map((group, index) => (
            <View key={`${group.day}-${index}`}>
              <SectionHeading label={recentGroupLabel(group.day, index, day)} first={index === 0} />
              {group.entries.map((entry) => (
                <RecentFoodRow
                  key={entry.id}
                  entry={entry}
                  onPress={() => setEditingEntry(entry)}
                  onQuickAdd={() => quickAdd(entry)}
                  adding={quickAddingId === entry.id}
                />
              ))}
            </View>
          ))}
        </View>
      ) : recent.isLoading ? (
        <View>
          <SectionHeading label="Recent foods" first />
          <View className="gap-md pt-md">
            <FoodRowSkeleton count={3} />
          </View>
        </View>
      ) : recent.isError ? (
        <SectionError
          title="Could not load recent foods"
          message="You can still search, scan, or describe a meal."
          onRetry={() => void recent.refetch()}
        />
      ) : (
        <Card className="items-center gap-md bg-primarySoft">
          <Text variant="heading3" color="dark">
            Nothing logged yet
          </Text>
          <Text variant="body" color="muted" className="text-center">
            Scan a barcode, search the database or describe what you ate to get started.
          </Text>
          <Button label="Log first meal" onPress={onDescribe} />
        </Card>
      )}
      {!showFavoritesOnly && favorites.data?.items.length ? (
        <View className="gap-md">
          <Text variant="heading3" color="muted">
            Favorites
          </Text>
          {favorites.data.items.map((item) => (
            <FoodResultRow
              key={item.id}
              item={item}
              onLog={() => openLogSheet(item)}
              loading={logFood.isPending}
            />
          ))}
        </View>
      ) : null}
      <SearchResultsSheet
        query={query}
        visible={hasQuery}
        onClose={() => setQuery("")}
        items={results}
        canSearch={canSearch}
        isLoading={searchLoading}
        isError={search.isError}
        isFetchingNextPage={search.isFetchingNextPage}
        hasNextPage={Boolean(search.hasNextPage)}
        onRetry={() => void search.refetch()}
        onFetchNextPage={() => void search.fetchNextPage()}
        onSelect={openLogSheet}
        onDescribe={() => {
          // Leaving for the describe screen ends the search, so the sheet is
          // not still sitting over the log tab on the way back.
          setQuery("");
          onDescribe();
        }}
        logging={logFood.isPending}
        topInset={searchFieldBottom ?? DEFAULT_SEARCH_FIELD_BOTTOM}
      />
      <EditFoodLogSheet
        entry={editingEntry}
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
      />
      <LogItemSheet
        item={loggingItem}
        day={day}
        visible={loggingItem !== null}
        onClose={() => setLoggingItem(null)}
      />
    </View>
  );
}

/** Which water sheet is open: a manual add, or an edit of an existing entry. */
type WaterSheetState = { mode: "add" } | { mode: "edit"; entry: WaterEntry } | null;

function WaterHome({ day }: { day: string }) {
  const water = useWater(day);
  const settings = useSettings();
  const addWater = useAddWaterLog(day);
  const updateWater = useUpdateWaterLog(day);
  const deleteWater = useDeleteWaterLog(day);
  const { showToast } = useToast();
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const waterUnit = waterUnitFor(unitSystem);
  const quickAddAmounts = [100, 250, 500];
  const [sheet, setSheet] = useState<WaterSheetState>(null);
  const data = water.data;
  const behind = Boolean(data?.alert);
  const canEditEntries = Boolean(data && isToday(data.day));
  const editingEntry = sheet?.mode === "edit" ? sheet.entry : null;

  const showWaterToast = (message: string, variant: "success" | "error" = "success") => {
    showToast({ message, variant });
  };

  const addWaterAmount = (amountMl: number, onSuccess?: () => void) => {
    addWater.mutate(amountMl, {
      onSuccess: () => {
        onSuccess?.();
        showWaterToast(`${formatWater(amountMl, unitSystem)} added`);
      },
      onError: () => showWaterToast("Could not add water. Try again.", "error"),
    });
  };

  if (water.isLoading) {
    return <WaterSkeleton />;
  }

  if (water.isError || !data) {
    return (
      <SectionError
        title="Could not load water"
        message="Your hydration log is unavailable right now."
        onRetry={() => void water.refetch()}
      />
    );
  }

  return (
    <View className="gap-2xl">
      <View className="flex-row items-center gap-xl">
        <WaterProgressRing progressPercent={data.progressPercent} behind={behind} />
        <View className="flex-1">
          <Text variant="heading1" color="dark">
            {roundTo(waterFromMl(data.totalMl, unitSystem), unitSystem === "imperial" ? 1 : 0)}{" "}
            <Text variant="body-sm" color="muted">
              {waterUnit}
            </Text>
          </Text>
          <Text variant="body-sm" color="muted">
            of {formatWater(data.targetMl, unitSystem)} daily goal
          </Text>
          <Text variant="body-sm" color={behind ? "accent" : "primary"} className="font-semibold">
            {formatWater(data.remainingMl, unitSystem)} remaining
          </Text>
        </View>
      </View>
      {data.alert ? (
        <Card className="gap-sm border-accent bg-accentSoft px-lg py-lg">
          <View className="flex-row items-center gap-sm">
            <Warning size={20} color={colors.accent} />
            <Text variant="heading3" color="accent">
              {data.alert.title}
            </Text>
          </View>
          <Text variant="body" color="accent">
            {data.alert.message}
          </Text>
        </Card>
      ) : null}
      <View className="gap-sm">
        <Text variant="body-sm" color="gray500">
          Quick add
        </Text>
        <View className="flex-row gap-md">
          {quickAddAmounts.map((amountMl) => {
            const amount = roundTo(
              waterFromMl(amountMl, unitSystem),
              unitSystem === "imperial" ? 1 : 0
            );
            const isDefault = amountMl === 250;
            return (
              <Pressable
                key={amountMl}
                accessibilityRole="button"
                accessibilityLabel={`Add ${formatWater(amountMl, unitSystem)} water`}
                disabled={addWater.isPending}
                onPress={() => addWaterAmount(amountMl)}
                className={`h-controlXl flex-1 items-center justify-center rounded-md ${
                  isDefault ? "bg-primarySoft" : "bg-gray-100"
                }`}
              >
                <Text
                  variant="body-sm"
                  color={isDefault ? "primary" : "muted"}
                  className="font-semibold"
                >
                  {amount}
                </Text>
                <Text variant="micro" color={isDefault ? "primary" : "muted"}>
                  {waterUnit}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add water manually"
          hitSlop={8}
          onPress={() => setSheet({ mode: "add" })}
          className="self-end py-xs"
        >
          <Text variant="body-sm" color="primary" className="font-semibold">
            Add water manually
          </Text>
        </Pressable>
      </View>
      <View>
        <View className="border-b border-gray-200 pb-md">
          <Text variant="body-sm" color="gray500" accessibilityRole="header">
            {"Today's log"}
          </Text>
        </View>
        {data.entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel="Edit water entry"
            disabled={!canEditEntries}
            onPress={() => setSheet({ mode: "edit", entry })}
            className="min-h-touchTarget flex-row items-center justify-between border-b border-gray-200 py-md"
          >
            <View>
              <Text variant="body" color="dark">
                Glass of water
              </Text>
              <Text variant="micro" color="gray500">
                {formatTime(entry.recordedAt)}
              </Text>
            </View>
            <View className="flex-row items-center gap-md">
              <View className="items-end">
                <Text variant="body" color="dark">
                  {roundTo(
                    waterFromMl(entry.amountMl, unitSystem),
                    unitSystem === "imperial" ? 1 : 0
                  )}
                </Text>
                <Text variant="micro" color="gray500">
                  {waterUnit}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete water entry"
                hitSlop={12}
                disabled={deleteWater.isPending}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  deleteWater.mutate(entry.id, {
                    onSuccess: () => showWaterToast("Water entry deleted"),
                    onError: () => showWaterToast("Could not delete water. Try again.", "error"),
                  });
                }}
              >
                <XCircle size={22} color={colors.gray[500]} />
              </Pressable>
            </View>
          </Pressable>
        ))}
        {data.entries.length === 0 ? (
          <Text variant="body" color="muted" className="pt-md">
            No water logged yet.
          </Text>
        ) : null}
      </View>
      <WaterAmountSheet
        visible={sheet !== null}
        title={editingEntry ? "Glass of water" : "Add water manually"}
        submitLabel={editingEntry ? "Save changes" : "Add water"}
        initialAmountMl={editingEntry?.amountMl ?? data.glassMl}
        initialRecordedAt={editingEntry?.recordedAt}
        unitSystem={unitSystem}
        loading={editingEntry ? updateWater.isPending : addWater.isPending}
        error={(editingEntry ? updateWater.error : addWater.error)?.message ?? null}
        onClose={() => setSheet(null)}
        onSubmit={({ amountMl, recordedAt }) => {
          if (!editingEntry) {
            addWaterAmount(amountMl, () => setSheet(null));
            return;
          }
          updateWater.mutate(
            { id: editingEntry.id, amountMl, recordedAt },
            {
              onSuccess: () => {
                setSheet(null);
                showWaterToast("Water entry updated");
              },
              onError: () => showWaterToast("Could not update water. Try again.", "error"),
            }
          );
        }}
      />
    </View>
  );
}

/** Group heading over the recent-food rows: muted label on a hairline rule. */
function SectionHeading({ label, first }: { label: string; first?: boolean }) {
  return (
    <View className={`border-b border-gray-200 pb-sm ${first ? "" : "pt-xl"}`}>
      <Text variant="body" color="subtle">
        {label}
      </Text>
    </View>
  );
}

/** "Recent foods" heads the newest group; older ones say which day they are. */
function recentGroupLabel(groupDay: string, index: number, today: string): string {
  if (index === 0) return "Recent foods";
  if (groupDay === addDays(today, -1)) return "Yesterday";
  const [year, month, date] = groupDay.split("-").map(Number);
  if (!year || !month || !date) return groupDay;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, date)
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="w-[76px] items-center gap-xs"
    >
      <View className="h-[42px] w-[42px] items-center justify-center rounded-pill bg-primarySoft">
        {icon}
      </View>
      <Text variant="caption" color="dark" className="text-center">
        {label}
      </Text>
    </Pressable>
  );
}

function RecentFoodRow({
  entry,
  onPress,
  onQuickAdd,
  adding,
}: {
  entry: FoodLogEntry;
  onPress: () => void;
  onQuickAdd: () => void;
  adding: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${entry.name}`}
      onPress={onPress}
      className="min-h-touchTarget flex-row items-center gap-md border-b border-gray-200 py-md"
    >
      <View className="flex-1 gap-xs">
        <Text variant="body" color="dark" numberOfLines={1}>
          {entry.name}
        </Text>
        <View className="flex-row items-center gap-sm">
          <Text variant="label" color="dark">
            {entry.nutrients.calories} kcal
          </Text>
          <Text variant="label" color="subtle">
            {formatTime(entry.consumedAt)}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text variant="body" color="dark">
          {entry.servings}
        </Text>
        <Text variant="label" color="subtle">
          {entry.servingUnit ?? "serving"}
        </Text>
      </View>
      {/* Only catalog-backed entries can be re-logged — an estimate has no
          `foodItemId` to log against. */}
      {entry.foodItemId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Log ${entry.name} again`}
          hitSlop={12}
          disabled={adding}
          onPress={(event) => {
            event?.stopPropagation?.();
            onQuickAdd();
          }}
        >
          <PlusCircle size={26} color={colors.primary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function FoodListSection({
  title,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyBody,
  children,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-md">
      <Text variant="heading3" color="muted">
        {title}
      </Text>
      {isLoading ? <FoodRowSkeleton count={3} /> : null}
      {isError ? (
        <SectionError
          title={`Could not load ${title.toLowerCase()}`}
          message="Try again in a moment."
          onRetry={onRetry}
        />
      ) : null}
      {!isLoading && !isError && children}
      {!isLoading && !isError && !hasRenderableChildren(children) ? (
        <Card className="items-center gap-sm">
          <Text variant="heading3" color="dark">
            {emptyTitle}
          </Text>
          <Text variant="body" color="muted" className="text-center">
            {emptyBody}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

function hasRenderableChildren(children: ReactNode): boolean {
  return Array.isArray(children) ? children.length > 0 : Boolean(children);
}

function WaterSkeleton() {
  return (
    <View className="gap-xl">
      <View className="flex-row items-center gap-xl">
        <SkeletonBlock className="h-[100px] w-[100px] rounded-pill" />
        <View className="flex-1 gap-sm">
          <SkeletonText size="heading" className="w-1/2" />
          <SkeletonText className="w-3/4" />
          <SkeletonText size="caption" className="w-1/2" />
        </View>
      </View>
      <View className="gap-md">
        <SkeletonText className="w-1/4" />
        <View className="flex-row gap-md">
          {[100, 250, 500].map((amount) => (
            <SkeletonBlock key={amount} className="h-[64px] flex-1" />
          ))}
        </View>
      </View>
      <View className="gap-md">
        <SkeletonText className="w-1/3" />
        <FoodRowSkeleton count={2} />
      </View>
    </View>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
