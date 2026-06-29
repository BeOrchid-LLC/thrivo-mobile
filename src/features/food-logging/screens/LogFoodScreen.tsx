import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Minus,
  Plus,
  TextAlignLeft,
  Warning,
  XCircle,
} from "phosphor-react-native";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionError,
  Segmented,
  SkeletonBlock,
  SkeletonText,
  Text,
} from "@/components";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import {
  isNetworkReachable,
  queueBarcodeScan,
  readQueuedBarcodeScans,
  removeQueuedBarcodeScan,
} from "@/lib";
import { colors } from "@/theme";
import type { FoodItem, FoodLogEntry, PortionMeasure } from "@/contracts";
import {
  useAddFavorite,
  useAddWaterLog,
  useBarcodeLookup,
  useDeleteWaterLog,
  useEstimateFood,
  useFavorites,
  useFoodSearch,
  useLogEstimate,
  useLogFood,
  useRecentFoods,
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

export function LogFoodScreen() {
  const day = useCurrentDay();
  const [segment, setSegment] = useState<Segment>("food");
  const [subview, setSubview] = useState<Subview>("main");

  if (subview === "scan") return <ScanBarcodeScreen day={day} onBack={() => setSubview("main")} />;
  if (subview === "describe")
    return <DescribeMealScreen day={day} onBack={() => setSubview("main")} />;

  return (
    <Screen scroll style={{ gap: 24 }}>
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const search = useFoodSearch(query);
  const recent = useRecentFoods();
  const favorites = useFavorites();
  const logFood = useLogFood();
  const addFavorite = useAddFavorite();

  const hasQuery = query.trim().length > 0;
  const results = search.data?.items ?? [];
  const recentItems = recent.data?.items ?? [];
  const favoriteItems = favorites.data?.items ?? [];

  const logItem = (food: FoodItem) => {
    logFood.mutate(
      {
        foodItemId: food.id,
        day,
        servings: 1,
        servingUnit: food.servingLabel,
      },
      {
        onSuccess: () => setMessage(`${food.name} logged.`),
        onError: () => setMessage("Could not log food. Try again."),
      }
    );
  };

  const favoriteItem = (food: FoodItem) => {
    addFavorite.mutate(food.id, {
      onSuccess: () => setMessage(`${food.name} added to favorites.`),
      onError: () => setMessage("Could not update favorites. Try again."),
    });
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
      {message ? (
        <Text variant="caption" color={message.includes("Could not") ? "error" : "primary"}>
          {message}
        </Text>
      ) : null}
      {hasQuery ? (
        <Card className="gap-md">
          <Text variant="body" color="dark">
            {`Showing results for "${query.trim()}"`}
          </Text>
          {search.isLoading ? <FoodRowSkeleton count={4} /> : null}
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
              key={item.id}
              item={item}
              onLog={() => logItem(item)}
              onFavorite={() => favoriteItem(item)}
              loading={logFood.isPending}
            />
          ))}
          {!search.isLoading && !search.isError && results.length === 0 ? (
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
              onLog={() => logItem(item)}
              onFavorite={() => undefined}
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
            <RecentFoodRow key={entry.id} entry={entry} />
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
              onLog={() => logItem(item)}
              onFavorite={() => undefined}
              loading={logFood.isPending}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function WaterHome({ day }: { day: string }) {
  const water = useWater(day);
  const addWater = useAddWaterLog(day);
  const deleteWater = useDeleteWaterLog(day);
  const [manual, setManual] = useState("250");
  const [message, setMessage] = useState<string | null>(null);
  const data = water.data?.water;
  const manualAmount = Number(manual);
  const manualValid = Number.isInteger(manualAmount) && manualAmount > 0 && manualAmount <= 5000;

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
            {data.totalMl.toLocaleString()}{" "}
            <Text variant="body" color="muted">
              ml
            </Text>
          </Text>
          <Text variant="body" color="muted">
            of {data.targetMl.toLocaleString()}ml daily goal
          </Text>
          <Text variant="caption" color="primary">
            {data.remainingMl.toLocaleString()}ml remaining
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
          {[100, 250, 500].map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              disabled={addWater.isPending}
              onPress={() =>
                addWater.mutate(amount, {
                  onSuccess: () => setMessage(`${amount} ml added.`),
                  onError: () => setMessage("Could not add water. Try again."),
                })
              }
              className={`min-h-[64px] flex-1 items-center justify-center rounded-md ${
                amount === 250 ? "bg-primarySoft" : "bg-gray-100"
              }`}
            >
              <Text variant="heading3" color={amount === 250 ? "primary" : "muted"}>
                {amount}
              </Text>
              <Text variant="body" color={amount === 250 ? "primary" : "muted"}>
                ml
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center gap-md">
          <Input
            value={manual}
            onChangeText={setManual}
            keyboardType="number-pad"
            trailingText="ml"
            className="text-center"
          />
          <Button
            label="Add"
            fullWidth={false}
            loading={addWater.isPending}
            disabled={!manualValid}
            onPress={() =>
              addWater.mutate(manualAmount, {
                onSuccess: () => setMessage(`${manualAmount} ml added.`),
                onError: () => setMessage("Could not add water. Try again."),
              })
            }
          />
        </View>
        {!manualValid ? (
          <Text variant="caption" color="error">
            Enter a whole number between 1 and 5,000 ml.
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
        {data.entries.map((entry) => (
          <View
            key={entry.id}
            className="flex-row items-center justify-between border-b border-gray-200 py-sm"
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
                  {entry.amountMl}
                </Text>
                <Text variant="caption" color="muted">
                  ml
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
        ))}
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
  const lookup = useBarcodeLookup(barcode.trim() || null);
  const logFood = useLogFood();
  const food = lookup.data?.food;

  useEffect(() => {
    let active = true;
    void (async () => {
      const online = await isNetworkReachable();
      if (!active || !online || barcode) return;
      const [queued] = await readQueuedBarcodeScans();
      if (!active || !queued) return;
      setBarcode(queued.barcode);
      setFormat(queued.format);
      setMessage("Replaying an offline scan.");
    })();
    return () => {
      active = false;
    };
  }, [barcode]);

  useEffect(() => {
    if (food && barcode) {
      void removeQueuedBarcodeScan(barcode);
    }
  }, [barcode, food]);

  const handleScan = (result: BarcodeScanningResult) => {
    const value = result.raw ?? result.data;
    if (!value) return;
    setScanned(true);
    setBarcode(value);
    setFormat(result.type);
    setMessage("Barcode captured. Looking up nutrition...");
    void (async () => {
      const online = await isNetworkReachable();
      if (!online) {
        await queueBarcodeScan({
          barcode: value,
          format: result.type,
          scannedAt: new Date().toISOString(),
        });
        setMessage("You are offline. The decoded barcode was saved for lookup later.");
      }
    })();
  };

  return (
    <Screen scroll style={{ gap: 24 }}>
      <HeaderBack
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
            setBarcode(value);
            setScanned(Boolean(value));
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
          message="The decoded barcode is saved locally if you are offline. Try again when your connection returns."
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
            onFavorite={() => undefined}
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
      <HeaderBack
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
  onFavorite,
  loading,
}: {
  item: FoodItem;
  onLog: () => void;
  onFavorite: () => void;
  loading: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-md border-b border-gray-200 py-sm">
      <View className="flex-1">
        <Text variant="body" color="dark">
          {item.name}
        </Text>
        <Text variant="caption" color="dark">
          {item.nutrients.calories} kcal per {item.servingLabel}
          {item.isEstimated ? "  Estimated" : ""}
        </Text>
      </View>
      <View className="flex-row gap-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add favorite"
          onPress={onFavorite}
        >
          <Heart size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log food"
          disabled={loading}
          onPress={onLog}
        >
          <Plus size={22} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function RecentFoodRow({ entry }: { entry: FoodLogEntry }) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-sm">
      <View>
        <Text variant="body" color="dark">
          {entry.name}
        </Text>
        <Text variant="caption" color="dark">
          {entry.nutrients.calories} kcal · {formatTime(entry.consumedAt)}
        </Text>
      </View>
      <View className="items-end">
        <Text variant="body" color="dark">
          {entry.servings}
        </Text>
        <Text variant="caption" color="muted">
          {entry.servingUnit ?? "serving"}
        </Text>
      </View>
    </View>
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

function HeaderBack({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View className="gap-xs">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}>
        <Text variant="heading2" color="dark">
          ← {title}
        </Text>
      </Pressable>
      <Text variant="body" color="muted">
        {subtitle}
      </Text>
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-[28px] w-[28px] items-center justify-center rounded-sm border border-gray-200 bg-primarySoft"
    >
      {label === "-" ? (
        <Minus size={16} color={colors.primary} />
      ) : (
        <Plus size={16} color={colors.primary} />
      )}
    </Pressable>
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
