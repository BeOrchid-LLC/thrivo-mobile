import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Heart } from "phosphor-react-native";
import {
  BottomSheetShell,
  Button,
  FormError,
  Text,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { isNetworkReachable } from "@/lib";
import { useFavoritesActions, useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import type { FoodItem, FoodSearchResult, LogMutationResponse } from "@/contracts";
import { QuantityUnitField } from "./QuantityUnitField";
import {
  buildServingChoices,
  defaultQuantityFor,
  resolveCreateServingFields,
} from "../utils/servingChoices";
import { parsePositiveQuantity } from "../utils/quantity";
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
  const [selectedChoiceKey, setSelectedChoiceKey] = useState("default");
  const [message, setMessage] = useState<string | null>(null);

  const catalogFoodItemId = item && "id" in item ? item.id : null;
  const alreadyFavorite = useIsFavorite(catalogFoodItemId);
  const itemKey = item ? ("id" in item ? item.id : item.externalId) : null;

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
