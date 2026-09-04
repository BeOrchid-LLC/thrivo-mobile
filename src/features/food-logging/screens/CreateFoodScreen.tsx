import { useState } from "react";
import { View } from "react-native";
import { Button, FormError, Input, PageHeader, Screen, Text, useToast } from "@/components";
import type { FoodItem } from "@/contracts";
import { LogItemSheet } from "../components/LogItemSheet";
import { useCreateFood } from "../hooks/useFoodLogging";
import {
  EMPTY_CUSTOM_FOOD,
  isNumericCustomFoodField,
  numericFieldError,
  validateCustomFood,
  type CustomFoodForm,
  type CustomFoodField,
} from "../utils/customFood";

export interface CreateFoodScreenProps {
  day: string;
  onBack: () => void;
  /**
   * Where a logged food lands. Once the created food has been logged the form
   * has nothing left to do, so the screen hands back to the food tracker,
   * where the new entry heads the recent list.
   */
  onLogged: () => void;
}

/**
 * Manual entry for a food the catalog doesn't have. Saves a personal food
 * (`POST /foods`) and then opens the normal log sheet on it, so creating and
 * logging is one flow rather than two.
 *
 * The number fields behave the way the onboarding ones do: they keep whatever
 * was typed and say what is wrong with it as it is typed, rather than dropping
 * keystrokes the keypad was only ever a hint against. Nothing is said while a
 * field is empty — "required" is a question for the first save attempt, which
 * is also when the text fields answer.
 */
export function CreateFoodScreen({ day, onBack, onLogged }: CreateFoodScreenProps) {
  const [form, setForm] = useState<CustomFoodForm>(EMPTY_CUSTOM_FOOD);
  const [submitted, setSubmitted] = useState(false);
  const [createdItem, setCreatedItem] = useState<FoodItem | null>(null);
  const createFood = useCreateFood();
  const { showToast } = useToast();

  const validation = validateCustomFood(form);

  const setField = (field: CustomFoodField) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const errorFor = (field: CustomFoodField): string | undefined => {
    if (submitted) return validation.errors[field];
    return isNumericCustomFoodField(field) ? numericFieldError(field, form[field]) : undefined;
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
  // food itself is already saved, so clear the form for the next one. Only a
  // log leaves the screen (see `onLogged`) — cancelling keeps you here.
  const closeLogSheet = () => {
    setCreatedItem(null);
    setForm(EMPTY_CUSTOM_FOOD);
    setSubmitted(false);
    createFood.reset();
  };

  return (
    <Screen
      scroll
      rhythm="default"
      header={
        <PageHeader
          title="Create a food"
          subtitle="Add something the search can't find."
          onBack={onBack}
        />
      }
      // Pinned: the form is long enough to scroll, so an inline Save would sit
      // wherever the last field happened to end.
      footer={
        <View className="gap-md">
          <FormError message={createFood.error?.message ?? null} />
          <Button label="Save food" onPress={save} loading={createFood.isPending} />
        </View>
      }
    >
      <Input
        label="Name of food"
        value={form.name}
        onChangeText={setField("name")}
        error={errorFor("name")}
        placeholder="Jollof rice, homemade"
      />
      <Input
        label="Brand (optional)"
        value={form.brand}
        onChangeText={setField("brand")}
        error={errorFor("brand")}
        placeholder="Who makes it?"
      />
      <Input
        label="One serving is"
        value={form.servingLabel}
        onChangeText={setField("servingLabel")}
        error={errorFor("servingLabel")}
        placeholder="1 bowl"
      />
      <Input
        label="Serving weight (optional)"
        value={form.servingGrams}
        onChangeText={setField("servingGrams")}
        error={errorFor("servingGrams")}
        numeric="decimal"
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
          error={errorFor("calories")}
          numeric="decimal"
          trailingText="kcal"
          placeholder="0"
        />
        <View className="flex-row gap-md">
          <View className="flex-1">
            <Input
              label="Protein"
              value={form.proteinG}
              onChangeText={setField("proteinG")}
              error={errorFor("proteinG")}
              numeric="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Carbs"
              value={form.carbsG}
              onChangeText={setField("carbsG")}
              error={errorFor("carbsG")}
              numeric="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Fat"
              value={form.fatG}
              onChangeText={setField("fatG")}
              error={errorFor("fatG")}
              numeric="decimal"
              trailingText="g"
              placeholder="0"
            />
          </View>
        </View>
      </View>

      <Text variant="caption" color="muted">
        Only you can see the foods you create. Blank macros are saved as 0.
      </Text>

      <LogItemSheet
        item={createdItem}
        day={day}
        visible={createdItem !== null}
        onClose={closeLogSheet}
        onLogged={onLogged}
      />
    </Screen>
  );
}
