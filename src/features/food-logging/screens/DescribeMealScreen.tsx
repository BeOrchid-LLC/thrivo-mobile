import { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { Button, Input, PageHeader, Screen, Segmented, StepperButton, Text } from "@/components";
import { isNetworkReachable } from "@/lib";
import { colors, inputFont } from "@/theme";
import type { PortionMeasure } from "@/contracts";
import { MacroCards } from "../components/MacroCards";
import { useEstimateFood, useLogEstimate } from "../hooks/useFoodLogging";
import { parsePositiveQuantity, stepQuantity } from "../utils/quantity";

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

export interface DescribeMealScreenProps {
  day: string;
  onBack: () => void;
}

/**
 * Free-text meal estimate. Pushed over the tab bar rather than rendered inside
 * the Log tab: it is a form, and its actions are pinned to the bottom, where a
 * tab bar would otherwise sit.
 */
export function DescribeMealScreen({ day, onBack }: DescribeMealScreenProps) {
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
      rhythm="default"
      header={
        <PageHeader
          title="Describe a meal"
          subtitle="We'll help you estimate the calories."
          onBack={onBack}
        />
      }
      // Pinned: the estimate lands below a form long enough to scroll, and the
      // action on it should not have to be scrolled back to.
      footer={
        <View className="gap-sm">
          {!canEstimate ? (
            <Text variant="caption" color="error">
              Add a food name and a positive portion quantity.
            </Text>
          ) : null}
          {estimateResult ? (
            <Button
              label="Log estimate"
              loading={logEstimate.isPending}
              onPress={logEstimatedMeal}
            />
          ) : null}
          <Button
            label={estimateResult ? "Estimate again" : "Estimate"}
            variant={estimateResult ? "outline" : "primary"}
            loading={estimate.isPending}
            disabled={!canEstimate}
            onPress={runEstimate}
          />
        </View>
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
          className="h-control flex-1 rounded-md border border-gray-300 bg-white text-center"
          style={[inputFont("body-lg"), { color: colors.dark }]}
        />
        <Text variant="body" color="primary">
          {measure === "weight" ? "grams" : measure}
        </Text>
        <StepperButton label="+" onPress={() => setQuantity(stepQuantity(quantity, 1))} />
      </View>
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
        </View>
      ) : null}
    </Screen>
  );
}
