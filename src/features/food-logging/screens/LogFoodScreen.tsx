import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";
import {
  Barcode,
  Heart,
  MagnifyingGlass,
  Plus,
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
} from "@/components";
import { queryClient, queryKeys } from "@/api";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import {
  isNetworkReachable,
  queueBarcodeScan,
  readQueuedBarcodeScans,
  removeQueuedBarcodeScan,
} from "@/lib";
import { colors } from "@/theme";
import { useSettings } from "@/features/settings";
import { subscribeTabRootReset } from "@/navigation/tab-root-reset";
import { useIsFavorite } from "@/stores";
import { formatWater, roundTo, waterFromMl, waterToMl, waterUnitFor } from "@/utils";
import type { FoodItem, FoodLogEntry, FoodSearchResult, PortionMeasure } from "@/contracts";
import { EditFoodLogSheet } from "../components/EditFoodLogSheet";
import { LogItemSheet } from "../components/LogItemSheet";
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
  useToggleFavorite,
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
      style={{ gap: 24, paddingTop: 32, paddingBottom: 16 }}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <View className="gap-xs">
        <Text variant="heading2" color="dark">
          Log Food
        </Text>
        <Text variant="body" color="muted">
          What are you logging today?
        </Text>
      </View>
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
  const [loggingItem, setLoggingItem] = useState<FoodItem | FoodSearchResult | null>(null);
  const search = useFoodSearch(debouncedQuery);
  const recent = useRecentFoods();
  const favorites = useFavorites();
  const logFood = useLogFood();

  const hasQuery = query.trim().length > 0;
  const canSearch = query.trim().length >= 2;
  const results = search.data?.items ?? [];
  const recentItems = recent.data?.items ?? [];
  const favoriteItems = favorites.data?.items ?? [];

  const openLogSheet = (food: FoodItem | FoodSearchResult) => {
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
      {hasQuery ? (
        <Card className="gap-md">
          <Text variant="body" color="dark">
            {`Showing results for "${query.trim()}"`}
          </Text>
          {!canSearch ? (
            <Text variant="caption" color="muted">
              Type at least 2 characters to search.
            </Text>
          ) : null}
          {canSearch && search.isLoading ? <FoodRowSkeleton count={4} /> : null}
          {search.isError ? (
            <SectionError
              title="Could not search foods"
              message="Check your connection and try again."
              onRetry={() => void search.refetch()}
              className="border-0 p-0"
            />
          ) : null}
          {results.map((item) => (
            <FoodResultRow
              key={item.externalId}
              item={item}
              onLog={() => openLogSheet(item)}
              loading={logFood.isPending}
            />
          ))}
          {canSearch && !search.isLoading && !search.isError && results.length === 0 ? (
            <View className="items-center gap-xs py-md">
              <Text variant="caption" color="muted">
                {"Don't see it?"}
              </Text>
              <Pressable accessibilityRole="button" onPress={onDescribe}>
                <Text variant="body" color="primary" className="font-semibold">
                  Describe the meal instead
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      ) : showFavoritesOnly ? (
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
          <Text variant="heading3" color="muted">
            Recent foods
          </Text>
          {recentItems.map((entry) => (
            <RecentFoodRow key={entry.id} entry={entry} onPress={() => setEditingEntry(entry)} />
          ))}
        </View>
      ) : recent.isLoading ? (
        <View className="gap-md">
          <Text variant="heading3" color="muted">
            Recent foods
          </Text>
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
      {favorites.data?.items.length ? (
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
  const deleteWater = useDeleteWaterLog(day);
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const waterUnit = waterUnitFor(unitSystem);
  const quickAddGlasses = [1, 2, 3];
  const [manual, setManual] = useState(
    unitSystem === "imperial" ? String(roundTo(waterFromMl(250, unitSystem), 1)) : "250"
  );
  const [message, setMessage] = useState<string | null>(null);
  const data = water.data;
  const manualAmount = Number(manual);
  const manualAmountMl = Math.round(waterToMl(manualAmount, unitSystem));
  const manualValid =
    Number.isFinite(manualAmount) &&
    manualAmount > 0 &&
    manualAmountMl > 0 &&
    manualAmountMl <= 5000;

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
        <View className="h-[100px] w-[100px] items-center justify-center rounded-pill border-[8px] border-primaryBright">
          <Text variant="heading3" color="muted">
            {data.progressPercent}%
          </Text>
          <Text variant="caption" color="muted">
            hydrated
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="heading1" color="dark">
            {formatWater(data.totalMl, unitSystem)}{" "}
            <Text variant="body" color="muted">
              logged
            </Text>
          </Text>
          <Text variant="body" color="muted">
            of {formatWater(data.targetMl, unitSystem)} daily goal
          </Text>
          <Text variant="caption" color="primary">
            {formatWater(data.remainingMl, unitSystem)} remaining
          </Text>
        </View>
      </View>
      {data.alert ? (
        <Card className="gap-sm border-accent bg-accentSoft">
          <View className="flex-row items-center gap-sm">
            <Warning size={20} color={colors.accent} />
            <Text variant="heading3" className="text-accent">
              {data.alert.title}
            </Text>
          </View>
          <Text variant="body" className="text-accent">
            {data.alert.message}
          </Text>
        </Card>
      ) : null}
      <View className="gap-md">
        <Text variant="body" color="dark">
          Quick add
        </Text>
        <View className="flex-row gap-md">
          {quickAddGlasses.map((n) => {
            const amountMl = data.glassMl * n;
            const amount = roundTo(
              waterFromMl(amountMl, unitSystem),
              unitSystem === "imperial" ? 1 : 0
            );
            const isDefault = n === 1;
            return (
              <Pressable
                key={n}
                accessibilityRole="button"
                disabled={addWater.isPending}
                onPress={() =>
                  addWater.mutate(amountMl, {
                    onSuccess: () => setMessage(`${formatWater(amountMl, unitSystem)} added.`),
                    onError: () => setMessage("Could not add water. Try again."),
                  })
                }
                className={`min-h-[64px] flex-1 items-center justify-center rounded-md ${
                  isDefault ? "bg-primarySoft" : "bg-gray-100"
                }`}
              >
                <Text variant="heading3" color={isDefault ? "primary" : "muted"}>
                  {n} {n === 1 ? "glass" : "glasses"}
                </Text>
                <Text variant="body" color={isDefault ? "primary" : "muted"}>
                  {amount} {waterUnit}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row items-center gap-md">
          <View className="flex-1">
            <Input
              value={manual}
              onChangeText={setManual}
              keyboardType="decimal-pad"
              trailingText={waterUnit}
              className="text-center"
            />
          </View>
          <Button
            label="Add"
            fullWidth={false}
            loading={addWater.isPending}
            disabled={!manualValid}
            onPress={() =>
              addWater.mutate(manualAmountMl, {
                onSuccess: () => setMessage(`${formatWater(manualAmountMl, unitSystem)} added.`),
                onError: () => setMessage("Could not add water. Try again."),
              })
            }
          />
        </View>
        {!manualValid ? (
          <Text variant="caption" color="error">
            Enter an amount up to {formatWater(5000, unitSystem)}.
          </Text>
        ) : null}
        {message ? (
          <Text variant="caption" color={message.includes("Could not") ? "error" : "primary"}>
            {message}
          </Text>
        ) : null}
      </View>
      <View className="gap-md">
        <Text variant="heading3" color="muted">
          {"Today's log"}
        </Text>
        {data.entries.map((entry) => {
          const glassCount = entry.amountMl / data.glassMl;
          const entryLabel =
            Number.isInteger(glassCount) && glassCount > 0
              ? `${glassCount} Glass${glassCount === 1 ? "" : "es"} of water`
              : "Water logged";
          return (
            <View
              key={entry.id}
              className="flex-row items-center justify-between border-b border-gray-200 py-sm"
            >
              <View>
                <Text variant="body" color="dark">
                  {entryLabel}
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
                  disabled={deleteWater.isPending}
                  onPress={() =>
                    deleteWater.mutate(entry.id, {
                      onSuccess: () => setMessage("Water entry deleted."),
                      onError: () => setMessage("Could not delete water. Try again."),
                    })
                  }
                >
                  <XCircle size={22} color={colors.gray[500]} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const barcodeTypes: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e", "code128"];

function ScanBarcodeScreen({ day, onBack }: { day: string; onBack: () => void }) {
  const [barcode, setBarcode] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const lookupBarcode = normalizeBarcode(barcode);
  const lookup = useBarcodeLookup(lookupBarcode);
  const logFood = useLogFood();
  const food = lookup.data?.food;
  const lastScanRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const online = await isNetworkReachable();
      if (!active || !online || barcode) return;
      const [queued] = await readQueuedBarcodeScans();
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
  }, [barcode]);

  useEffect(() => {
    if (food && lookupBarcode) {
      void removeQueuedBarcodeScan(lookupBarcode);
    }
  }, [food, lookupBarcode]);

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
    void (async () => {
      const online = await isNetworkReachable();
      if (!online) {
        await queueBarcodeScan({
          barcode: normalized,
          format: result.type,
          scannedAt: new Date().toISOString(),
        });
        setMessage("You are offline. The decoded barcode was saved for lookup later.");
      }
    })();
  };

  return (
    <Screen scroll style={{ gap: 24 }}>
      <PageHeader
        title="Scan Barcode"
        subtitle="Packaged foods - instant nutrition look up."
        onBack={onBack}
      />
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
          <FoodResultRow
            item={food}
            onLog={() =>
              logFood.mutate({
                foodItemId: food.id,
                day,
                servings: 1,
                servingUnit: food.servingLabel,
              })
            }
            loading={logFood.isPending}
          />
        </Card>
      ) : null}
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
  const quantityValue = Number(quantity);
  const canEstimate = name.trim().length > 0 && Number.isFinite(quantityValue) && quantityValue > 0;

  const payload = useMemo(
    () => ({
      name,
      ingredients,
      cookingMethod: method || undefined,
      portionMeasure: measure,
      quantity: quantityValue,
    }),
    [ingredients, measure, method, name, quantityValue]
  );

  return (
    <Screen scroll style={{ gap: 20 }}>
      <PageHeader
        title="Describe a meal"
        subtitle="We'll help you estimate the calories."
        onBack={onBack}
      />
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
        <Segmented value={measure} onChange={setMeasure} options={portions} />
      </View>
      <View className="flex-row items-center gap-md">
        <StepperButton
          label="-"
          onPress={() => setQuantity(String(Math.max((Number(quantity) || 1) - 1, 1)))}
        />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          className="h-[48px] flex-1 rounded-md border border-gray-300 bg-white text-center text-[18px] text-dark"
        />
        <Text variant="body" color="primary">
          {measure === "weight" ? "grams" : measure}
        </Text>
        <StepperButton label="+" onPress={() => setQuantity(String((Number(quantity) || 0) + 1))} />
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
        onPress={() =>
          estimate.mutate(payload, {
            onError: () => setMessage("Could not estimate this meal. Try again."),
          })
        }
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
            <Text variant="caption" className="rounded-md bg-accentSoft px-sm py-xs text-accent">
              Estimated
            </Text>
          </View>
          <MacroCards nutrients={estimateResult.nutrients} />
          <Button
            label="Log estimate"
            loading={logEstimate.isPending}
            onPress={() =>
              logEstimate.mutate(
                {
                  ...payload,
                  day,
                  nutrients: estimateResult.nutrients,
                  servingUnit: estimateResult.servingUnit,
                },
                {
                  onSuccess: () => setMessage("Estimate logged."),
                  onError: () => setMessage("Could not log estimate. Try again."),
                }
              )
            }
          />
        </View>
      ) : null}
    </Screen>
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

function FoodResultRow({
  item,
  onLog,
  loading,
}: {
  item: FoodItem | FoodSearchResult;
  onLog: () => void;
  loading: boolean;
}) {
  // Ensures the local favorites store is synced wherever this row renders,
  // regardless of navigation path (TanStack Query dedupes by key, so this
  // costs nothing extra when a parent already called useFavorites()).
  useFavorites();
  const toggleFavorite = useToggleFavorite();
  const foodItemId = "id" in item ? item.id : null;
  const isFavorite = useIsFavorite(foodItemId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log ${item.name}`}
      disabled={loading}
      onPress={onLog}
      className="flex-row items-center justify-between gap-md border-b border-gray-200 py-sm"
    >
      <View className="flex-1">
        <Text variant="body" color="dark">
          {item.name}
        </Text>
        <Text variant="caption" color="dark">
          {item.nutrients.calories} kcal per {item.servingLabel}
          {"isEstimated" in item && item.isEstimated ? "  Estimated" : ""}
        </Text>
      </View>
      <View className="flex-row gap-sm">
        {foodItemId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
            onPress={() => toggleFavorite(foodItemId)}
            hitSlop={8}
          >
            <Heart size={22} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
          </Pressable>
        ) : null}
        <Plus size={22} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function RecentFoodRow({ entry, onPress }: { entry: FoodLogEntry; onPress: () => void }) {
  useFavorites();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = useIsFavorite(entry.foodItemId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${entry.name}`}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-gray-200 py-sm"
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
        {entry.foodItemId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
            onPress={() => toggleFavorite(entry.foodItemId as string)}
            hitSlop={8}
          >
            <Heart size={22} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
          </Pressable>
        ) : null}
        <View className="items-end">
          <Text variant="body" color="dark">
            {entry.servings}
          </Text>
          <Text variant="caption" color="muted">
            {entry.servingUnit ?? "serving"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function MacroCards({
  nutrients,
}: {
  nutrients: { proteinG: number; carbsG: number; fatG: number };
}) {
  return (
    <View className="flex-row gap-md">
      {[
        ["Protein", nutrients.proteinG],
        ["Carbs", nutrients.carbsG],
        ["Fat", nutrients.fatG],
      ].map(([label, value]) => (
        <View key={label} className="flex-1 items-center rounded-md bg-primarySoft p-md">
          <Text variant="caption" color="dark">
            {label}
          </Text>
          <Text variant="heading3" color="dark">
            {value}g
          </Text>
        </View>
      ))}
    </View>
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

function FoodRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-sm">
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className="flex-row items-center justify-between border-b border-gray-200 py-sm"
        >
          <View className="flex-1 gap-xs">
            <SkeletonText className="w-2/3" />
            <SkeletonText size="caption" className="w-1/3" />
          </View>
          <SkeletonBlock className="h-[24px] w-[24px] rounded-pill" />
        </View>
      ))}
    </View>
  );
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
