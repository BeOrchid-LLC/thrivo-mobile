import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Heart } from "phosphor-react-native";
import { BottomSheetShell, Button, FormError, StepperButton, Text } from "@/components";
import { useFavoritesActions, useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import type { FoodItem, FoodSearchResult, LogMutationResponse } from "@/contracts";
import {
  useAddFavorite,
  useFavorites,
  useLogFood,
  useRemoveFavorite,
} from "../hooks/useFoodLogging";

export interface LogItemSheetProps {
  item: FoodItem | FoodSearchResult | null;
  day: string;
  visible: boolean;
  onClose: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Bottom sheet shown before a NEW food gets logged - lets the user set
 * servings/time and optionally favorite it, rather than the log silently
 * landing with defaults. Works for both catalog items (FoodItem, has an
 * `id`) and raw external search hits (FoodSearchResult, `externalId` only -
 * no favoritable id until the log succeeds and the backend resolves it).
 */
export function LogItemSheet({ item, day, visible, onClose }: LogItemSheetProps) {
  const logFood = useLogFood();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { addFavoriteId, removeFavoriteId } = useFavoritesActions();
  useFavorites(); // keeps the local favorites store synced

  const [servings, setServings] = useState("1");
  const [consumedAt, setConsumedAt] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [favoriteChecked, setFavoriteChecked] = useState(false);

  const catalogFoodItemId = item && "id" in item ? item.id : null;
  const alreadyFavorite = useIsFavorite(catalogFoodItemId);
  const itemKey = item ? ("id" in item ? item.id : item.externalId) : null;

  useEffect(() => {
    if (!visible || !item) return;
    setServings("1");
    setConsumedAt(new Date());
    setFavoriteChecked(alreadyFavorite);
    logFood.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, itemKey]);

  if (!item) return null;

  const servingsValue = Number(servings);
  const hasValidServings = servingsValue > 0;

  const onTimePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !date) return;
    setConsumedAt(date);
  };

  const save = () => {
    const base = {
      day,
      servings: servingsValue,
      servingUnit: item.servingLabel,
      consumedAt: consumedAt.toISOString(),
    };
    logFood.mutate(
      "id" in item ? { ...base, foodItemId: item.id } : { ...base, externalFood: item },
      {
        onSuccess: (data) => {
          // useLogFood's offline-write mutation types success data as `unknown` since
          // its mutationFn is merged in externally (registerOfflineMutations); the real
          // shape is LogMutationResponse.
          const response = data as LogMutationResponse;
          const resolvedFoodItemId = response.entry.foodItemId ?? catalogFoodItemId;

          if (favoriteChecked && resolvedFoodItemId && !alreadyFavorite) {
            addFavoriteId(resolvedFoodItemId);
            addFavorite.mutate(resolvedFoodItemId, {
              onError: () => removeFavoriteId(resolvedFoodItemId),
            });
          } else if (!favoriteChecked && catalogFoodItemId && alreadyFavorite) {
            removeFavoriteId(catalogFoodItemId);
            removeFavorite.mutate(catalogFoodItemId, {
              onError: () => addFavoriteId(catalogFoodItemId),
            });
          }
          onClose();
        },
      }
    );
  };

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={item.name}
      closeLabel="Close log food"
      subtitle={
        <Text variant="caption" color="dark">
          {item.nutrients.calories} kcal per {item.servingLabel}
        </Text>
      }
      modalOverlay={
        showTimePicker ? (
          <DateTimePicker
            mode="time"
            display="spinner"
            value={consumedAt}
            onChange={onTimePicked}
          />
        ) : null
      }
    >
      <View className="gap-sm">
        <Text variant="caption" color="dark">
          Servings
        </Text>
        <View className="flex-row items-center gap-md">
          <StepperButton
            label="-"
            size="lg"
            glyph="text"
            onPress={() => setServings(String(Math.max(Number(servings) - 1, 1)))}
          />
          <TextInput
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
            className="h-[48px] flex-1 rounded-md border border-gray-300 bg-white text-center text-[18px] text-dark"
          />
          <StepperButton
            label="+"
            size="lg"
            glyph="text"
            onPress={() => setServings(String(Number(servings) + 1))}
          />
        </View>
      </View>

      <View className="gap-sm">
        <Text variant="caption" color="dark">
          Time logged
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change time logged"
          onPress={() => setShowTimePicker(true)}
          className="h-[48px] items-center justify-center rounded-md border border-gray-300 bg-white"
        >
          <Text variant="body" color="dark">
            {formatTime(consumedAt)}
          </Text>
        </Pressable>
      </View>

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

      <Button
        label="Log food"
        onPress={save}
        loading={logFood.isPending}
        disabled={!hasValidServings}
      />
    </BottomSheetShell>
  );
}
