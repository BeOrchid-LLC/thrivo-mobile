import { useState } from "react";
import { View } from "react-native";
import { Button, FormError, Input, PageHeader, Screen, Text, useToast } from "@/components";
import { rhythm } from "@/theme";
import type { FoodItem } from "@/contracts";
import { LogItemSheet } from "../components/LogItemSheet";
import { useCreateFood } from "../hooks/useFoodLogging";
import {
  EMPTY_CUSTOM_FOOD,
  NUMERIC_CUSTOM_FOOD_FIELDS,
  sanitizeDecimalInput,
  validateCustomFood,
  type CustomFoodForm,
  type CustomFoodField,
} from "../utils/customFood";

export interface CreateFoodScreenProps {
  day: string;
  onBack: () => void;
}

/**
 * Manual entry for a food the catalog doesn't have. Saves a personal food
 * (`POST /foods`) and then opens the normal log sheet on it, so creating and
 * logging is one flow rather than two.
 *
 * Errors appear only after the first save attempt — validating every keystroke
 * would flag half-typed numbers as wrong while the user is still typing.
 */
export function CreateFoodScreen({ day, onBack }: CreateFoodScreenProps) {
  const [form, setForm] = useState<CustomFoodForm>(EMPTY_CUSTOM_FOOD);
  const [submitted, setSubmitted] = useState(false);
  const [createdItem, setCreatedItem] = useState<FoodItem | null>(null);
  const createFood = useCreateFood();
  const { showToast } = useToast();

  const validation = validateCustomFood(form);
  const errors = submitted ? validation.errors : {};

  const setField = (field: CustomFoodField) => (value: string) => {
    const next = NUMERIC_CUSTOM_FOOD_FIELDS.includes(field) ? sanitizeDecimalInput(value) : value;
    setForm((current) => ({ ...current, [field]: next }));
  };

  const save = () => {
    setSubmitted(true);
    if (!validation.payload) return;
    createFood.mutate(validation.payload, {
      onSuccess: ({ food }) => {
        showToast({ message: `“${food.name}” saved to your foods` });
        setCreatedItem(food);
      },
    });
  };

  // The sheet closes both after a successful log and on cancel; either way the
  // food itself is already saved, so clear the form for the next one.
  const closeLogSheet = () => {
    setCreatedItem(null);
    setForm(EMPTY_CUSTOM_FOOD);
    setSubmitted(false);
    createFood.reset();
  };

  return (
    <Screen
      scroll
      style={{ gap: rhythm.pageGap }}
      header={
        <PageHeader
          title="Create a food"
          subtitle="Add something the search can't find."
          onBack={onBack}
        />
      }
    >
      <Input
        label="Name of food"
        value={form.name}
        onChangeText={setField("name")}
        error={errors.name}
        placeholder="Jollof rice, homemade"
      />
      <Input
        label="Brand (optional)"
        value={form.brand}
        onChangeText={setField("brand")}
        error={errors.brand}
        placeholder="Who makes it?"
      />
      <Input
        label="One serving is"
        value={form.servingLabel}
        onChangeText={setField("servingLabel")}
        error={errors.servingLabel}
        placeholder="1 bowl"
      />
      <Input
        label="Serving weight (optional)"
        value={form.servingGrams}
        onChangeText={setField("servingGrams")}
        error={errors.servingGrams}
        keyboardType="decimal-pad"
        inputMode="decimal"
        trailingText="g"
        placeholder="250"
      />

      <View className="gap-md">
        <Text variant="heading3" color="muted">
          Nutrition per serving
        </Text>
        <Input
          label="Calories"
          value={form.calories}
          onChangeText={setField("calories")}
          error={errors.calories}
          keyboardType="decimal-pad"
          inputMode="decimal"
          trailingText="kcal"
          placeholder="0"
        />
        <View className="flex-row gap-md">
          <View className="flex-1">
            <Input
              label="Protein"
              value={form.proteinG}
              onChangeText={setField("proteinG")}
              error={errors.proteinG}
              keyboardType="decimal-pad"
              inputMode="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Carbs"
              value={form.carbsG}
              onChangeText={setField("carbsG")}
              error={errors.carbsG}
              keyboardType="decimal-pad"
              inputMode="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Fat"
              value={form.fatG}
              onChangeText={setField("fatG")}
              error={errors.fatG}
              keyboardType="decimal-pad"
              inputMode="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
        </View>
      </View>

      <Text variant="caption" color="muted">
        Only you can see the foods you create. Blank macros are saved as 0.
      </Text>

      <FormError message={createFood.error?.message ?? null} />
      <Button label="Save food" onPress={save} loading={createFood.isPending} />

      <LogItemSheet
        item={createdItem}
        day={day}
        visible={createdItem !== null}
        onClose={closeLogSheet}
      />
    </Screen>
  );
}
