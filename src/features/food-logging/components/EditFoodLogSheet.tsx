import { useEffect, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Heart } from "phosphor-react-native";
import { BottomSheetShell, Button, FormError, StepperButton, Text } from "@/components";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import { isToday } from "@/utils";
import type { FoodLogEntry } from "@/contracts";
import {
  useDeleteFoodLog,
  useFavorites,
  useToggleFavorite,
  useUpdateFoodLog,
} from "../hooks/useFoodLogging";

export interface EditFoodLogSheetProps {
  entry: FoodLogEntry | null;
  visible: boolean;
  onClose: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Bottom sheet for a logged entry. Today's entries get full editing
 * (servings/time/delete); older entries (dashboard history, etc.) only get the
 * favorite toggle - re-deriving their macros from a servings edit would touch
 * an already-settled day's totals.
 */
export function EditFoodLogSheet({ entry, visible, onClose }: EditFoodLogSheetProps) {
  const updateLog = useUpdateFoodLog();
  const deleteLog = useDeleteFoodLog();
  useFavorites(); // keeps the local favorites store synced
  const toggleFavoriteId = useToggleFavorite();
  const isFavorite = useIsFavorite(entry?.foodItemId);

  const [servings, setServings] = useState("1");
  const [consumedAt, setConsumedAt] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!visible || !entry) return;
    setServings(String(entry.servings));
    setConsumedAt(new Date(entry.consumedAt));
    updateLog.reset();
    deleteLog.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry?.id]);

  if (!entry) return null;

  const editable = isToday(entry.day);
  const toggleFavorite = () => {
    if (entry.foodItemId) toggleFavoriteId(entry.foodItemId);
  };

  const servingsValue = Number(servings);
  const hasValidServings = servingsValue > 0;
  const hasChanges =
    (hasValidServings && servingsValue !== entry.servings) ||
    consumedAt.toISOString() !== entry.consumedAt;

  const onTimePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !date) return;
    setConsumedAt(date);
  };

  const save = () => {
    updateLog.mutate(
      {
        id: entry.id,
        servings: hasValidServings ? servingsValue : undefined,
        consumedAt: consumedAt.toISOString(),
      },
      { onSuccess: onClose }
    );
  };

  const confirmDelete = () => {
    Alert.alert("Delete entry?", `Remove "${entry.name}" from your log.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteLog.mutate(entry.id, { onSuccess: onClose }),
      },
    ]);
  };

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={entry.name}
      closeLabel="Close edit entry"
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
      headerAccessory={
        entry.foodItemId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
            onPress={toggleFavorite}
          >
            <Heart size={22} color={colors.primary} weight={isFavorite ? "fill" : "regular"} />
          </Pressable>
        ) : null
      }
    >
      {editable ? (
        <>
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

          {!hasValidServings ? <FormError message="Servings must be a positive number." /> : null}
          <FormError message={updateLog.error?.message ?? deleteLog.error?.message ?? null} />

          <Button
            label="Save changes"
            onPress={save}
            loading={updateLog.isPending}
            disabled={!hasChanges || !hasValidServings || deleteLog.isPending}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            onPress={confirmDelete}
            disabled={deleteLog.isPending || updateLog.isPending}
            className="items-center py-sm"
          >
            <Text variant="body" color="error" className="font-semibold">
              {deleteLog.isPending ? "Deleting..." : "Delete entry"}
            </Text>
          </Pressable>
        </>
      ) : (
        <View className="gap-xs">
          <Text variant="body" color="muted">
            {entry.servings}
            {entry.servingUnit ? ` ${entry.servingUnit}` : " serving"} ·{" "}
            {formatTime(new Date(entry.consumedAt))}
          </Text>
          <Text variant="caption" color="muted">
            Editing is only available for entries logged today.
          </Text>
        </View>
      )}
    </BottomSheetShell>
  );
}
