import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Heart } from "phosphor-react-native";
import {
  BottomSheetShell,
  Button,
  FormError,
  PremiumGate,
  Text,
  TimeField,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { useEntitlement } from "@/hooks/useEntitlement";
import { isNetworkReachable } from "@/lib";
import { useFavoritesActions, useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import type { FoodItem, LogMutationResponse } from "@/contracts";
import { QuantityUnitField } from "./QuantityUnitField";
import { MacroCards } from "./MacroCards";
import {
  GRAMS_SERVING_ID,
  buildServingChoices,
  defaultQuantityFor,
  resolveCreateServingFields,
  type ServingChoice,
} from "../utils/servingChoices";
import { parsePositiveQuantity } from "../utils/quantity";
import {
  useAddFavorite,
  useFavorites,
  useLogFood,
  useRemoveFavorite,
} from "../hooks/useFoodLogging";

export interface LogItemSheetProps {
  item: FoodItem | null;
  day: string;
  visible: boolean;
  onClose: () => void;
}

function scaleNutrients(
  nutrients: FoodItem["nutrients"],
  choice: ServingChoice,
  quantity: number,
  referenceGrams: number
): FoodItem["nutrients"] {
  const isGrams = choice.servingId === GRAMS_SERVING_ID || choice.key === GRAMS_SERVING_ID;
  const selectedGrams = isGrams ? quantity : quantity * (choice.grams ?? referenceGrams);
  const factor = selectedGrams / referenceGrams;
  return {
    calories: Math.round(nutrients.calories * factor),
    proteinG: nutrients.proteinG * factor,
    carbsG: nutrients.carbsG * factor,
    fatG: nutrients.fatG * factor,
  };
}

/**
 * Bottom sheet shown before a NEW catalog food gets logged — servings/time,
 * optional favorite, and quantity-scaled macros (premium for P/C/F).
 */
export function LogItemSheet({ item, day, visible, onClose }: LogItemSheetProps) {
  const logFood = useLogFood();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { addFavoriteId, removeFavoriteId } = useFavoritesActions();
  const entitlement = useEntitlement();
  useFavorites(); // keeps the local favorites store synced

  const [servings, setServings] = useState("1");
  const [consumedAt, setConsumedAt] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [favoriteChecked, setFavoriteChecked] = useState(false);
  const [selectedChoiceKey, setSelectedChoiceKey] = useState("default");
  const [message, setMessage] = useState<string | null>(null);

  const alreadyFavorite = useIsFavorite(item?.id ?? null);
  const itemKey = item?.id ?? null;

  // Guaranteed non-empty whenever `item` is set - buildServingChoices always
  // returns at least the item's own fixed serving.
  const choices = useMemo(() => (item ? buildServingChoices(item) : []), [item]);
  const selectedChoice = choices.find((choice) => choice.key === selectedChoiceKey) ?? choices[0];

  useEffect(() => {
    if (!visible || !item) return;
    setServings("1");
    setConsumedAt(new Date());
    setFavoriteChecked(alreadyFavorite);
    setSelectedChoiceKey(choices[0]?.key ?? "default");
    setMessage(null);
    logFood.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, itemKey]);

  if (!item) return null;

  const servingsValue = parsePositiveQuantity(servings);
  const hasValidServings = servingsValue !== null;
  const scaled = scaleNutrients(
    item.nutrients,
    selectedChoice!,
    servingsValue ?? 1,
    item.servingGrams ?? 100
  );

  const onSelectChoice = (choice: (typeof choices)[number]) => {
    setSelectedChoiceKey(choice.key);
    setServings(defaultQuantityFor(choice, item.servingGrams));
  };

  const onTimePicked = (event: TimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !date) return;
    setConsumedAt(date);
  };

  const save = () => {
    setMessage(null);
    void isNetworkReachable().then((online) => {
      if (!online) setMessage("Saved offline. We'll sync this food when you're back online.");
    });
    const base = {
      day,
      consumedAt: consumedAt.toISOString(),
      // selectedChoice can't actually be undefined here (see choices comment above).
      ...resolveCreateServingFields(item, selectedChoice!, servingsValue!),
    };
    logFood.mutate(
      { ...base, foodItemId: item.id },
      {
        onSuccess: (data) => {
          // useLogFood's offline-write mutation types success data as `unknown` since
          // its mutationFn is merged in externally (registerOfflineMutations); the real
          // shape is LogMutationResponse.
          const response = data as LogMutationResponse;
          const resolvedFoodItemId = response.entry.foodItemId ?? item.id;

          if (favoriteChecked && resolvedFoodItemId && !alreadyFavorite) {
            addFavoriteId(resolvedFoodItemId);
            addFavorite.mutate(resolvedFoodItemId, {
              onError: () => removeFavoriteId(resolvedFoodItemId),
            });
          } else if (!favoriteChecked && alreadyFavorite) {
            removeFavoriteId(item.id);
            removeFavorite.mutate(item.id, {
              onError: () => addFavoriteId(item.id),
            });
          }
          onClose();
        },
      }
    );
  };

  const macros = (
    <MacroCards
      nutrients={{
        proteinG: scaled.proteinG,
        carbsG: scaled.carbsG,
        fatG: scaled.fatG,
      }}
    />
  );

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={item.name}
      closeLabel="Close log food"
      subtitle={
        <Text variant="caption" color="dark">
          {scaled.calories} kcal
          {item.isEstimated ? " · Estimated" : ""}
        </Text>
      }
      modalOverlay={
        showTimePicker ? <TimePicker value={consumedAt} onChange={onTimePicked} /> : null
      }
    >
      <QuantityUnitField
        quantity={servings}
        onQuantityChange={setServings}
        choices={choices}
        selectedKey={selectedChoiceKey}
        onSelectChoice={onSelectChoice}
      />

      {entitlement.isLoading ? (
        <View className="h-24" />
      ) : entitlement.isPremium ? (
        macros
      ) : (
        <PremiumGate
          title="Subscribe to see macros"
          subtitle="Protein, carbs, and fat unlock with Premium."
          onViewPlans={() => router.push("/(app)/settings/subscription")}
        >
          {macros}
        </PremiumGate>
      )}

      <TimeField value={consumedAt} onPress={() => setShowTimePicker(true)} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favoriteChecked ? "Remove favorite" : "Add favorite"}
        onPress={() => setFavoriteChecked((v) => !v)}
        className="flex-row items-center gap-sm"
      >
        <Heart size={22} color={colors.primary} weight={favoriteChecked ? "fill" : "regular"} />
        <Text variant="body" color="dark">
          Favorite this food
        </Text>
      </Pressable>

      {!hasValidServings ? <FormError message="Servings must be a positive number." /> : null}
      <FormError message={logFood.error?.message ?? null} />
      {message ? (
        <Text variant="caption" color="primary">
          {message}
        </Text>
      ) : null}

      <Button
        label="Log food"
        onPress={save}
        loading={logFood.isPending}
        disabled={!hasValidServings}
      />
    </BottomSheetShell>
  );
}
