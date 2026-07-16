import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Heart } from "phosphor-react-native";
import {
  BottomSheetShell,
  Button,
  FormError,
  Text,
  TimePicker,
  type TimePickerEvent,
} from "@/components";
import { useIsFavorite } from "@/stores";
import { colors } from "@/theme";
import { isToday } from "@/utils";
import type { FoodLogEntry } from "@/contracts";
import { QuantityUnitField } from "./QuantityUnitField";
import {
  buildServingChoices,
  defaultQuantityFor,
  resolveUpdateServingFields,
} from "../utils/servingChoices";
import { parsePositiveQuantity } from "../utils/quantity";
import {
  useDeleteFoodLog,
  useFavorites,
  useFoodDetail,
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
  const [selectedChoiceKey, setSelectedChoiceKey] = useState("default");
  const [unitChanged, setUnitChanged] = useState(false);

  const editable = Boolean(entry && isToday(entry.day));
  // Only fetch/offer unit-switching for today's editable entries with a catalog
  // link - historical entries and manual/external entries with no foodItemId
  // keep quantity-only editing (no serving options to switch between).
  const detail = useFoodDetail(entry?.foodItemId ?? null, visible && editable);
  const choices = useMemo(
    () => (detail.data ? buildServingChoices(detail.data) : []),
    [detail.data]
  );
  const selectedChoice = choices.find((choice) => choice.key === selectedChoiceKey) ?? choices[0];

  useEffect(() => {
    if (!visible || !entry) return;
    setServings(String(entry.servings));
    setConsumedAt(new Date(entry.consumedAt));
    setUnitChanged(false);
    updateLog.reset();
    deleteLog.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry?.id]);

  // The logged entry only stores a free-text servingUnit snapshot, not which
  // exact serving id was chosen - best-effort match it against the food's
  // current options once they load, falling back to the default option.
  useEffect(() => {
    if (!visible || !entry || choices.length === 0) return;
    const savedLabel = entry.servingUnit?.trim().toLowerCase();
    const matched = savedLabel
      ? choices.find((choice) => choice.label.trim().toLowerCase() === savedLabel)
      : null;
    setSelectedChoiceKey((matched ?? choices[0]).key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry?.id, choices]);

  if (!entry) return null;

  const toggleFavorite = () => {
    if (entry.foodItemId) toggleFavoriteId(entry.foodItemId);
  };

  const servingsValue = parsePositiveQuantity(servings);
  const hasValidServings = servingsValue !== null;
  const hasChanges =
    (hasValidServings && servingsValue !== entry.servings) ||
    consumedAt.toISOString() !== entry.consumedAt ||
    unitChanged;

  const onSelectChoice = (choice: (typeof choices)[number]) => {
    setSelectedChoiceKey(choice.key);
    setUnitChanged(true);
    setServings(defaultQuantityFor(choice, detail.data?.servingGrams ?? null));
  };

  const onTimePicked = (event: TimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !date) return;
    setConsumedAt(date);
  };

  const save = () => {
    const servingFields =
      unitChanged && selectedChoice
        ? resolveUpdateServingFields(selectedChoice, servingsValue!)
        : { servings: servingsValue ?? undefined };
    updateLog.mutate(
      { id: entry.id, consumedAt: consumedAt.toISOString(), ...servingFields },
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
        showTimePicker ? <TimePicker value={consumedAt} onChange={onTimePicked} /> : null
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
