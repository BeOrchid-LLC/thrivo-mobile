import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, TextInput, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";
import {
  Barcode,
  CaretRight,
  Heart,
  MagnifyingGlass,
  TextAlignLeft,
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
  StepperButton,
  Text,
  useToast,
} from "@/components";
import { queryClient, queryKeys } from "@/api";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import {
  analytics,
  isNetworkReachable,
  queueBarcodeScan,
  readQueuedBarcodeScans,
  removeQueuedBarcodeScan,
} from "@/lib";
import { useUserId } from "@/stores";
import { colors, rhythm } from "@/theme";
import { useSettings } from "@/features/settings";
import { subscribeTabRootReset } from "@/navigation/tab-root-reset";
import { formatWater, isToday, roundTo, waterFromMl, waterUnitFor } from "@/utils";
import type { FoodItem, FoodLogEntry, PortionMeasure, WaterEntry } from "@/contracts";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";
import { FavoriteButton } from "../components/FavoriteButton";
import { FoodResultRow } from "../components/FoodResultRow";
import { FoodRowSkeleton } from "../components/FoodRowSkeleton";
import { LogItemSheet } from "../components/LogItemSheet";
import { MacroCards } from "../components/MacroCards";
import { SearchResultsSheet } from "../components/SearchResultsSheet";
import { WaterAmountSheet } from "../components/WaterAmountSheet";
import { WaterProgressRing } from "../components/WaterProgressRing";
import { parsePositiveQuantity, stepQuantity } from "../utils/quantity";
import {
  useAddWaterLog,
  useBarcodeLookup,
  useDeleteWaterLog,
  useEstimateFood,
  useFavorites,
  useFoodSearch,
  useLogEstimate,
  useLogFood,
  useRecentFoods,
  useUpdateWaterLog,
  useWater,
} from "../hooks/useFoodLogging";

type Segment = "food" | "water";
type Subview = "main" | "scan" | "describe";

const portions: { label: string; value: PortionMeasure }[] = [
  { label: "Serving", value: "serving" },
  { label: "Weight", value: "weight" },
  { label: "Cup", value: "cup" },
  { label: "Tbsp", value: "tbsp" },
  { label: "Piece", value: "piece" },
];

// Switching units shouldn't leave a stale quantity from the previous unit behind
// (e.g. 900 grams -> Serving landing on "900 servings") - reset to a sensible
// per-unit default instead.
const DEFAULT_QUANTITY_BY_MEASURE: Record<PortionMeasure, string> = {
  weight: "100",
  serving: "1",
  cup: "1",
  tbsp: "1",
  piece: "1",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

function normalizeBarcode(value: string): string | null {
  const normalized = value.replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(normalized) ? normalized : null;
}

export function LogFoodScreen() {
  const day = useCurrentDay();
  const [segment, setSegment] = useState<Segment>("food");
  const [subview, setSubview] = useState<Subview>("main");
  const [resetVersion, setResetVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(
    () =>
      subscribeTabRootReset("log", () => {
        setSegment("food");
        setSubview("main");
        setResetVersion((version) => version + 1);
      }),
    []
  );

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

  if (subview === "scan") return <ScanBarcodeScreen day={day} onBack={() => setSubview("main")} />;
  if (subview === "describe")
    return <DescribeMealScreen day={day} onBack={() => setSubview("main")} />;

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      rhythm="default"
      header={
        <PageHeader
          title={segment === "food" ? "Log Food" : "Log Water"}
          subtitle="What are you logging today?"
          showBack={false}
        />
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Segmented
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
          onScan={() => setSubview("scan")}
          onDescribe={() => setSubview("describe")}
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
}: {
  day: string;
  onScan: () => void;
  onDescribe: () => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [loggingItem, setLoggingItem] = useState<FoodItem | null>(null);
  const search = useFoodSearch(debouncedQuery);
  const recent = useRecentFoods();
  const favorites = useFavorites();
  const logFood = useLogFood();

  const hasQuery = query.trim().length > 0;
  const canSearch = query.trim().length >= 2;
  const results = search.items;
  const recentItems = recent.data?.items ?? [];
  const favoriteItems = favorites.data?.items ?? [];
  const searchLoading =
    canSearch && (search.isLoading || (results.length === 0 && search.isFetchingNextPage));

  const openLogSheet = (food: FoodItem) => {
    setQuery("");
    setLoggingItem(food);
  };

  return (
    <View className="gap-xl">
      <View className="flex-row justify-between">
        <QuickAction
          icon={<Barcode size={22} color={colors.dark} />}
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
          icon={<TextAlignLeft size={22} color={colors.dark} />}
          label="Describe it"
          onPress={onDescribe}
        />
      </View>
      <Input
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setShowFavoritesOnly(false);
        }}
        placeholder="Or, search by name..."
        autoCapitalize="none"
        leadingIcon={<MagnifyingGlass size={20} color={colors.gray[500]} />}
      />
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
      ) : recentItems.length > 0 ? (
        <View className="gap-md">
          <RecentFoodsHeader />
          {recentItems.map((entry) => (
            <RecentFoodRow key={entry.id} entry={entry} onPress={() => setEditingEntry(entry)} />
          ))}
        </View>
      ) : recent.isLoading ? (
        <View className="gap-md">
          <RecentFoodsHeader />
          <FoodRowSkeleton count={3} />
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
        onDescribe={onDescribe}
        logging={logFood.isPending}
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
  const [manualOpen, setManualOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaterEntry | null>(null);
  const data = water.data;
  const behind = Boolean(data?.alert);
  const canEditEntries = Boolean(data && isToday(data.day));

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
    <View className="gap-xl">
      <View className="flex-row items-center gap-xl">
        <WaterProgressRing progressPercent={data.progressPercent} behind={behind} />
        <View className="flex-1">
          <Text variant="heading1" color="dark">
            {roundTo(waterFromMl(data.totalMl, unitSystem), unitSystem === "imperial" ? 1 : 0)}{" "}
            <Text variant="body" color="muted">
              {waterUnit}
            </Text>
          </Text>
          <Text variant="body" color="muted">
            of {formatWater(data.targetMl, unitSystem)} daily goal
          </Text>
          <Text variant="body" color={behind ? "accent" : "primary"} className="font-semibold">
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
      <View className="gap-md">
        <Text variant="body" color="dark">
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
                className={`h-controlLg flex-1 items-center justify-center rounded-md ${
                  isDefault ? "bg-primarySoft" : "bg-gray-100"
                }`}
              >
                <Text
                  variant="body"
                  color={isDefault ? "primary" : "muted"}
                  className="font-semibold"
                >
                  {amount}
                </Text>
                <Text variant="caption" color={isDefault ? "primary" : "muted"}>
                  {waterUnit}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add water manually"
          onPress={() => setManualOpen(true)}
          className="min-h-touchTarget justify-center self-end py-xs"
        >
          <Text variant="body" color="primary" className="font-semibold">
            Add water manually
          </Text>
        </Pressable>
      </View>
      <View className="gap-md">
        <View className="flex-row items-center justify-between">
          <Text variant="heading3" color="muted">
            {"Today's log"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all water logs"
            onPress={() =>
              router.push({ pathname: "/(app)/water-history", params: { returnTo: "log" } })
            }
            className="min-h-touchTarget flex-row items-center gap-xs py-xs"
          >
            <Text variant="body" color="primary" className="font-semibold">
              View all logs
            </Text>
            <CaretRight size={16} color={colors.primary} weight="bold" />
          </Pressable>
        </View>
        {data.entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel="Edit water entry"
            disabled={!canEditEntries}
            onPress={() => setEditingEntry(entry)}
            className="min-h-touchTarget flex-row items-center justify-between border-b border-gray-200 py-sm"
          >
            <View>
              <Text variant="body" color="dark">
                Glass of water
              </Text>
              <Text variant="caption" color="muted">
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
                <Text variant="caption" color="muted">
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
          <Text variant="body" color="muted">
            No water logged yet.
          </Text>
        ) : null}
      </View>
      <WaterAmountSheet
        visible={manualOpen}
        title="Add water manually"
        submitLabel="Add water"
        initialAmountMl={0}
        unitSystem={unitSystem}
        loading={addWater.isPending}
        error={addWater.error?.message ?? null}
        onClose={() => setManualOpen(false)}
        onSubmit={({ amountMl }) => addWaterAmount(amountMl, () => setManualOpen(false))}
      />
      <WaterAmountSheet
        visible={editingEntry !== null}
        title="Glass of water"
        submitLabel="Save changes"
        initialAmountMl={editingEntry?.amountMl ?? data.glassMl}
        initialRecordedAt={editingEntry?.recordedAt}
        unitSystem={unitSystem}
        loading={updateWater.isPending}
        error={updateWater.error?.message ?? null}
        onClose={() => setEditingEntry(null)}
        onSubmit={({ amountMl, recordedAt }) => {
          if (!editingEntry) return;
          updateWater.mutate(
            { id: editingEntry.id, amountMl, recordedAt },
            {
              onSuccess: () => {
                setEditingEntry(null);
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

const barcodeTypes: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e", "code128"];

function ScanBarcodeScreen({ day, onBack }: { day: string; onBack: () => void }) {
  const [barcode, setBarcode] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  // The offline queue is per user, so scans can never replay into another
  // account on a shared device.
  const ownerId = useUserId();
  const [message, setMessage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loggingItem, setLoggingItem] = useState<FoodItem | null>(null);
  const lookupBarcode = normalizeBarcode(barcode);
  const lookup = useBarcodeLookup(lookupBarcode);
  const food = lookup.data?.food;
  const lastScanRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const online = await isNetworkReachable();
      if (!active || !online || barcode) return;
      const [queued] = ownerId ? await readQueuedBarcodeScans(ownerId) : [];
      if (!active || !queued) return;
      const normalized = normalizeBarcode(queued.barcode);
      if (!normalized) return;
      setBarcode(normalized);
      setFormat(queued.format);
      setMessage("Replaying an offline scan.");
    })();
    return () => {
      active = false;
    };
    // `ownerId` is part of the dependency list on purpose: it arrives from the
    // session store only after Clerk restores and GET /users/me resolves, so on
    // a cold start into this screen the first run sees `null` and finds nothing
    // to replay. Without re-running when it lands, a scan queued offline would
    // sit in storage forever with no visible failure.
  }, [barcode, ownerId]);

  useEffect(() => {
    if (food && lookupBarcode) {
      if (ownerId) void removeQueuedBarcodeScan(ownerId, lookupBarcode);
    }
    // Same reason as above — a lookup that resolves before the session id does
    // would leave the scan queued and replay it again on the next visit.
  }, [food, lookupBarcode, ownerId]);

  const handleScan = (result: BarcodeScanningResult) => {
    const value = result.raw ?? result.data;
    if (!value) return;
    const normalized = normalizeBarcode(value);
    if (!normalized) {
      setMessage("That barcode format is not supported. Try another packaged food.");
      return;
    }
    if (lastScanRef.current === normalized) return;
    lastScanRef.current = normalized;
    setScanned(true);
    setBarcode(normalized);
    setFormat(result.type);
    setMessage("Barcode captured. Looking up nutrition...");
    // A decoded barcode, not a lookup result — the funnel step is the scan
    // itself. The `lastScanRef` guard above keeps a steady camera to one event.
    analytics.track("thrivo.barcode_scanned", { format: result.type });
    void (async () => {
      const online = await isNetworkReachable();
      if (!online) {
        if (ownerId) {
          await queueBarcodeScan(ownerId, {
            barcode: normalized,
            format: result.type,
            scannedAt: new Date().toISOString(),
          });
        }
        setMessage("You are offline. The decoded barcode was saved for lookup later.");
      }
    })();
  };

  return (
    <Screen
      scroll
      style={{ gap: rhythm.pageGap }}
      header={
        <PageHeader
          title="Scan Barcode"
          subtitle="Packaged foods - instant nutrition look up."
          onBack={onBack}
        />
      }
    >
      <View className="h-[220px] overflow-hidden rounded-lg bg-dark">
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-sm p-lg">
            <Barcode size={32} color={colors.primaryBright} />
            <Text variant="caption" color="inverse" className="text-center">
              Camera access is needed to scan packaged foods.
            </Text>
            <Button
              label="Enable camera"
              fullWidth={false}
              variant="secondary"
              onPress={() => void requestPermission()}
            />
          </View>
        )}
        <View className="absolute inset-0 justify-between p-lg" pointerEvents="none">
          <View className="flex-row justify-between">
            <Corner />
            <Barcode size={28} color={colors.primaryBright} />
            <Corner right />
          </View>
          <View className="h-[1px] bg-primaryBright" />
          <Text variant="caption" color="inverse" className="text-center">
            Align barcode with frame
          </Text>
        </View>
      </View>
      {barcode ? (
        <Card className="gap-xs bg-primarySoft">
          <Text variant="caption" color="muted">
            Captured barcode
          </Text>
          <Text variant="body" color="dark">
            {barcode}
            {format ? ` · ${format}` : ""}
          </Text>
          <Button
            label="Scan another"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              setBarcode("");
              setFormat(null);
              setScanned(false);
              lastScanRef.current = null;
              setMessage(null);
            }}
          />
        </Card>
      ) : null}
      {__DEV__ ? (
        <Input
          label="Developer barcode"
          value={barcode}
          onChangeText={(value) => {
            const normalized = normalizeBarcode(value);
            setBarcode(normalized ?? value);
            setScanned(Boolean(normalized));
          }}
          keyboardType="number-pad"
          placeholder="Type barcode to test lookup"
        />
      ) : null}
      {message ? (
        <Text variant="caption" color={message.includes("offline") ? "muted" : "primary"}>
          {message}
        </Text>
      ) : null}
      {lookup.isFetching ? <Text color="muted">Looking up barcode...</Text> : null}
      {lookup.isError ? (
        <SectionError
          title="Could not look up barcode"
          message="Something went wrong looking that up. Try again in a moment."
          onRetry={() => void lookup.refetch()}
        />
      ) : null}
      {barcode && lookup.data && !lookup.isFetching && !lookup.isError && !food ? (
        <SectionError
          title="Barcode not found"
          message="This packaged food is not in Open Food Facts yet. You can search by name or describe the meal instead."
          onRetry={() => void lookup.refetch()}
        />
      ) : null}
      {food ? (
        <Card className="gap-md">
          <FoodResultRow item={food} onLog={() => setLoggingItem(food)} loading={false} />
        </Card>
      ) : null}
      <LogItemSheet
        item={loggingItem}
        day={day}
        visible={loggingItem !== null}
        onClose={() => setLoggingItem(null)}
      />
    </Screen>
  );
}

function DescribeMealScreen({ day, onBack }: { day: string; onBack: () => void }) {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [method, setMethod] = useState("");
  const [measure, setMeasure] = useState<PortionMeasure>("weight");
  const [quantity, setQuantity] = useState("150");
  const [message, setMessage] = useState<string | null>(null);
  const estimate = useEstimateFood();
  const logEstimate = useLogEstimate();
  const estimateResult = estimate.data?.estimate;
  const quantityValue = parsePositiveQuantity(quantity);
  const canEstimate = name.trim().length > 0 && quantityValue !== null;

  const payload = useMemo(
    () => ({
      name,
      ingredients,
      cookingMethod: method || undefined,
      portionMeasure: measure,
      quantity: quantityValue ?? 0,
    }),
    [ingredients, measure, method, name, quantityValue]
  );

  const handleMeasureChange = (next: PortionMeasure) => {
    setMeasure(next);
    setQuantity(DEFAULT_QUANTITY_BY_MEASURE[next]);
  };

  const runEstimate = () => {
    setMessage(null);
    estimate.mutate(payload, {
      onError: () => setMessage("Could not estimate this meal. Try again."),
    });
  };

  const logEstimatedMeal = () => {
    setMessage(null);
    void isNetworkReachable().then((online) => {
      if (!online) setMessage("Saved offline. We'll sync this meal when you're back online.");
    });
    logEstimate.mutate(
      {
        ...payload,
        day,
        nutrients: estimateResult!.nutrients,
        referenceGrams: estimateResult!.referenceGrams,
        servingUnit: estimateResult!.servingUnit,
      },
      {
        onSuccess: () => setMessage("Estimate logged."),
        onError: () => setMessage("Could not log estimate. Try again."),
      }
    );
  };

  return (
    <Screen
      scroll
      style={{ gap: rhythm.pageGap }}
      header={
        <PageHeader
          title="Describe a meal"
          subtitle="We'll help you estimate the calories."
          onBack={onBack}
        />
      }
    >
      <Input
        label="Name of food"
        value={name}
        onChangeText={setName}
        placeholder="Chicken breast, grilled"
      />
      <Input
        label="Main Ingredients"
        value={ingredients}
        onChangeText={setIngredients}
        placeholder="Yam, melon, palm oil"
      />
      <Input
        label="Cooking method"
        value={method}
        onChangeText={setMethod}
        placeholder="How was it cooked?"
      />
      <View className="gap-sm">
        <Text variant="caption" color="dark">
          Portion measure
        </Text>
        <Segmented value={measure} onChange={handleMeasureChange} options={portions} />
      </View>
      <View className="flex-row items-center gap-md">
        <StepperButton label="-" onPress={() => setQuantity(stepQuantity(quantity, -1))} />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          className="h-control flex-1 rounded-md border border-gray-300 bg-white text-center text-body-lg"
          style={{ color: colors.dark }}
        />
        <Text variant="body" color="primary">
          {measure === "weight" ? "grams" : measure}
        </Text>
        <StepperButton label="+" onPress={() => setQuantity(stepQuantity(quantity, 1))} />
      </View>
      {!canEstimate ? (
        <Text variant="caption" color="error">
          Add a food name and a positive portion quantity.
        </Text>
      ) : null}
      <Button
        label="Estimate"
        loading={estimate.isPending}
        disabled={!canEstimate}
        onPress={runEstimate}
      />
      {message ? (
        <Text variant="caption" color={message.includes("Could not") ? "error" : "primary"}>
          {message}
        </Text>
      ) : null}
      {estimateResult ? (
        <View className="gap-lg">
          <View className="items-center">
            <Text variant="heading1" color="dark">
              {estimateResult.nutrients.calories}{" "}
              <Text variant="body" color="muted">
                kcal
              </Text>
            </Text>
            <Text variant="caption" color="accent" className="rounded-md bg-accentSoft px-sm py-xs">
              Estimated
            </Text>
          </View>
          <MacroCards nutrients={estimateResult.nutrients} />
          <Button label="Log estimate" loading={logEstimate.isPending} onPress={logEstimatedMeal} />
        </View>
      ) : null}
    </Screen>
  );
}

function RecentFoodsHeader() {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="heading3" color="muted">
        Recent foods
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View food history"
        onPress={() => router.push({ pathname: "/(app)/history", params: { returnTo: "log" } })}
        className="min-h-touchTarget flex-row items-center gap-xs py-xs"
      >
        <Text variant="body" color="primary" className="font-semibold">
          View history
        </Text>
        <CaretRight size={16} color={colors.primary} weight="bold" />
      </Pressable>
    </View>
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
    <Pressable accessibilityRole="button" onPress={onPress} className="items-center gap-xs">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-pill bg-primarySoft">
        {icon}
      </View>
      <Text variant="caption" color="dark">
        {label}
      </Text>
    </Pressable>
  );
}

function RecentFoodRow({ entry, onPress }: { entry: FoodLogEntry; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${entry.name}`}
      onPress={onPress}
      className="min-h-touchTarget flex-row items-center justify-between border-b border-gray-200 py-sm"
    >
      <View className="flex-1">
        <Text variant="body" color="dark">
          {entry.name}
        </Text>
        <Text variant="caption" color="dark">
          {entry.nutrients.calories} kcal · {formatTime(entry.consumedAt)}
        </Text>
      </View>
      <View className="flex-row items-center gap-md">
        <View className="items-end">
          <Text variant="body" color="dark">
            {entry.servings}
          </Text>
          <Text variant="caption" color="muted">
            {entry.servingUnit ?? "serving"}
          </Text>
        </View>
        {entry.foodItemId ? <FavoriteButton foodItemId={entry.foodItemId} size={22} /> : null}
      </View>
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

function Corner({ right }: { right?: boolean }) {
  return (
    <View
      className={`h-[24px] w-[24px] border-primaryBright ${right ? "border-r border-t" : "border-l border-t"}`}
    />
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
