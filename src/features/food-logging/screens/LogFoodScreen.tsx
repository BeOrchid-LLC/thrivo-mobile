import { useMemo, useState, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  Barcode,
  Drop,
  Heart,
  MagnifyingGlass,
  Minus,
  Plus,
  TextAlignLeft,
  Warning,
  XCircle,
} from "phosphor-react-native";
import { Button, Card, Input, Screen, Segmented, Text } from "@/components";
import { colors } from "@/theme";
import { localDay } from "@/utils";
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

const today = localDay();
const portions: { label: string; value: PortionMeasure }[] = [
  { label: "Serving", value: "serving" },
  { label: "Weight", value: "weight" },
  { label: "Cup", value: "cup" },
  { label: "Tbsp", value: "tbsp" },
  { label: "Piece", value: "piece" },
];

export function LogFoodScreen() {
  const [segment, setSegment] = useState<Segment>("food");
  const [subview, setSubview] = useState<Subview>("main");

  if (subview === "scan") return <ScanBarcodeScreen onBack={() => setSubview("main")} />;
  if (subview === "describe") return <DescribeMealScreen onBack={() => setSubview("main")} />;

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
        <FoodHome onScan={() => setSubview("scan")} onDescribe={() => setSubview("describe")} />
      ) : (
        <WaterHome />
      )}
    </Screen>
  );
}

function FoodHome({ onScan, onDescribe }: { onScan: () => void; onDescribe: () => void }) {
  const [query, setQuery] = useState("");
  const search = useFoodSearch(query);
  const recent = useRecentFoods();
  const favorites = useFavorites();
  const logFood = useLogFood();
  const addFavorite = useAddFavorite();

  const hasQuery = query.trim().length > 0;
  const results = search.data?.items ?? [];
  const recentItems = recent.data?.items ?? [];

  const logItem = (food: FoodItem) => {
    logFood.mutate({
      foodItemId: food.id,
      day: today,
      servings: 1,
      servingUnit: food.servingLabel,
    });
  };

  return (
    <View className="gap-xl">
      <View className="flex-row justify-between">
        <QuickAction icon={<Barcode size={22} color={colors.dark} />} label="Scan barcode" onPress={onScan} />
        <QuickAction
          icon={<Heart size={22} color={colors.dark} />}
          label="Favorites"
          onPress={() => undefined}
        />
        <QuickAction
          icon={<TextAlignLeft size={22} color={colors.dark} />}
          label="Describe it"
          onPress={onDescribe}
        />
      </View>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Or, search by name..."
        autoCapitalize="none"
        leadingIcon={<MagnifyingGlass size={20} color={colors.gray[500]} />}
      />
      {hasQuery ? (
        <Card className="gap-md">
          <Text variant="body" color="dark">
            Showing results for "{query.trim()}"
          </Text>
          {search.isLoading ? <Text color="muted">Searching...</Text> : null}
          {results.map((item) => (
            <FoodResultRow
              key={item.id}
              item={item}
              onLog={() => logItem(item)}
              onFavorite={() => addFavorite.mutate(item.id)}
              loading={logFood.isPending}
            />
          ))}
          {!search.isLoading && results.length === 0 ? (
            <View className="items-center gap-xs py-md">
              <Text variant="caption" color="muted">
                Don't see it?
              </Text>
              <Pressable accessibilityRole="button" onPress={onDescribe}>
                <Text variant="body" color="primary" className="font-semibold">
                  Describe the meal instead
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      ) : recentItems.length > 0 ? (
        <View className="gap-md">
          <Text variant="heading3" color="muted">
            Recent foods
          </Text>
          {recentItems.map((entry) => (
            <RecentFoodRow key={entry.id} entry={entry} />
          ))}
        </View>
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

function WaterHome() {
  const water = useWater(today);
  const addWater = useAddWaterLog(today);
  const deleteWater = useDeleteWaterLog(today);
  const [manual, setManual] = useState("250");
  const data = water.data?.water;

  if (water.isLoading) {
    return <Text color="muted">Loading water...</Text>;
  }

  if (water.isError || !data) {
    return (
      <Card className="gap-md">
        <Text variant="heading3" color="dark">
          Water is a premium metric
        </Text>
        <Text variant="body" color="muted">
          Upgrade to track hydration against your daily target.
        </Text>
      </Card>
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
              onPress={() => addWater.mutate(amount)}
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
            onPress={() => addWater.mutate(Number(manual))}
          />
        </View>
      </View>
      <View className="gap-md">
        <Text variant="heading3" color="muted">
          Today's log
        </Text>
        {data.entries.map((entry) => (
          <View key={entry.id} className="flex-row items-center justify-between border-b border-gray-200 py-sm">
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
                onPress={() => deleteWater.mutate(entry.id)}
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

function ScanBarcodeScreen({ onBack }: { onBack: () => void }) {
  const [barcode, setBarcode] = useState("");
  const lookup = useBarcodeLookup(barcode.trim() || null);
  const logFood = useLogFood();
  const food = lookup.data?.food;

  return (
    <Screen scroll style={{ gap: 24 }}>
      <HeaderBack title="Scan Barcode" subtitle="Packaged foods - instant nutrition look up." onBack={onBack} />
      <View className="h-[200px] justify-between rounded-lg bg-dark p-lg">
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
      <Text variant="caption" color="dark">
        Offline scans should queue the decoded barcode value and replay lookup when you're back online.
      </Text>
      <Input
        label="Barcode"
        value={barcode}
        onChangeText={setBarcode}
        keyboardType="number-pad"
        placeholder="Type barcode to test lookup"
      />
      {lookup.isFetching ? <Text color="muted">Looking up barcode...</Text> : null}
      {food ? (
        <Card className="gap-md">
          <FoodResultRow
            item={food}
            onLog={() =>
              logFood.mutate({
                foodItemId: food.id,
                day: today,
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

function DescribeMealScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("Chicken breast, grilled");
  const [ingredients, setIngredients] = useState("Yam, melon, palm oil");
  const [method, setMethod] = useState("");
  const [measure, setMeasure] = useState<PortionMeasure>("weight");
  const [quantity, setQuantity] = useState("150");
  const estimate = useEstimateFood();
  const logEstimate = useLogEstimate();
  const estimateResult = estimate.data?.estimate;

  const payload = useMemo(
    () => ({
      name,
      ingredients,
      cookingMethod: method || undefined,
      portionMeasure: measure,
      quantity: Number(quantity) || 1,
    }),
    [ingredients, measure, method, name, quantity]
  );

  return (
    <Screen scroll style={{ gap: 20 }}>
      <HeaderBack title="Describe a meal" subtitle="We'll help you estimate the calories." onBack={onBack} />
      <Input label="Name of food" value={name} onChangeText={setName} />
      <Input label="Main Ingredients" value={ingredients} onChangeText={setIngredients} />
      <Input label="Cooking method" value={method} onChangeText={setMethod} placeholder="How was it cooked?" />
      <View className="gap-sm">
        <Text variant="caption" color="dark">
          Portion measure
        </Text>
        <Segmented value={measure} onChange={setMeasure} options={portions} />
      </View>
      <View className="flex-row items-center gap-md">
        <StepperButton label="-" onPress={() => setQuantity(String(Math.max(Number(quantity) - 1, 1)))} />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          className="h-[48px] flex-1 rounded-md border border-gray-300 bg-white text-center text-[18px] text-dark"
        />
        <Text variant="body" color="primary">
          {measure === "weight" ? "grams" : measure}
        </Text>
        <StepperButton label="+" onPress={() => setQuantity(String(Number(quantity || 0) + 1))} />
      </View>
      <Button label="Estimate" loading={estimate.isPending} onPress={() => estimate.mutate(payload)} />
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
              logEstimate.mutate({
                ...payload,
                day: today,
                nutrients: estimateResult.nutrients,
                servingUnit: estimateResult.servingUnit,
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="items-center gap-xs">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-pill bg-primarySoft">{icon}</View>
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
        <Pressable accessibilityRole="button" accessibilityLabel="Add favorite" onPress={onFavorite}>
          <Heart size={22} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Log food" disabled={loading} onPress={onLog}>
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

function MacroCards({ nutrients }: { nutrients: { proteinG: number; carbsG: number; fatG: number } }) {
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
      {label === "-" ? <Minus size={16} color={colors.primary} /> : <Plus size={16} color={colors.primary} />}
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
