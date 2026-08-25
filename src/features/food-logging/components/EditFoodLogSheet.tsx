import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  BottomSheetShell,
  Button,
  FormError,
  PremiumGate,
  Text,
  TimeField,
  TimePicker,
  formatTime,
  type TimePickerEvent,
} from "@/components";
import { useEntitlement } from "@/hooks/useEntitlement";
import { isToday } from "@/utils";
import type { FoodLogEntry } from "@/contracts";
import { QuantityUnitField } from "./QuantityUnitField";
import { MacroCards } from "./MacroCards";
import { FavoriteButton } from "./FavoriteButton";
import {
  GRAMS_SERVING_ID,
  buildServingChoices,
  defaultQuantityFor,
  resolveUpdateServingFields,
  type ServingChoice,
} from "../utils/servingChoices";
import { parsePositiveQuantity } from "../utils/quantity";
import {
  useDeleteFoodLog,
  useFoodDetail,
  useFavorites,
  useUpdateFoodLog,
} from "../hooks/useFoodLogging";

export interface EditFoodLogSheetProps {
  entry: FoodLogEntry | null;
  visible: boolean;
  onClose: () => void;
}

function scaleEntryNutrients(entry: FoodLogEntry, quantity: number): FoodLogEntry["nutrients"] {
  const baseQty = entry.servings > 0 ? entry.servings : 1;
  const factor = quantity / baseQty;

  return {
    calories: Math.round(entry.nutrients.calories * factor),
    proteinG: entry.nutrients.proteinG * factor,
    carbsG: entry.nutrients.carbsG * factor,
    fatG: entry.nutrients.fatG * factor,
  };
}

function scaleCatalogNutrients(
  nutrients: FoodLogEntry["nutrients"],
  choice: ServingChoice,
  quantity: number,
  referenceGrams: number
): FoodLogEntry["nutrients"] {
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
 * Bottom sheet for a logged entry. Today's entries get full editing
 * (servings/time/delete); older entries (dashboard history, etc.) only get the
 * favorite toggle - re-deriving their macros from a servings edit would touch
 * an already-settled day's totals.
 */
export function EditFoodLogSheet({ entry, visible, onClose }: EditFoodLogSheetProps) {
  useFavorites();
  const updateLog = useUpdateFoodLog();
  const deleteLog = useDeleteFoodLog();
  const entitlement = useEntitlement();
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
    const matchedById = entry.servingId
      ? choices.find(
          (choice) => choice.servingId === entry.servingId || choice.key === entry.servingId
        )
      : null;
    const matchedByLabel = savedLabel
      ? choices.find((choice) => choice.label.trim().toLowerCase() === savedLabel)
      : null;
    setSelectedChoiceKey((matchedById ?? matchedByLabel ?? choices[0]).key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry?.id, choices]);

  if (!entry) return null;

  const servingsValue = parsePositiveQuantity(servings);
  const hasValidServings = servingsValue !== null;
  const hasChanges =
    (hasValidServings && servingsValue !== entry.servings) ||
    consumedAt.toISOString() !== entry.consumedAt ||
    unitChanged;

  const previewQty = servingsValue ?? entry.servings;
  const scaled =
    detail.data && selectedChoice
      ? scaleCatalogNutrients(
          detail.data.nutrients,
          selectedChoice,
          previewQty,
          detail.data.servingGrams ?? 100
        )
      : scaleEntryNutrients(entry, previewQty);

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
      title={entry.name}
      closeLabel="Close edit entry"
      subtitle={
        <Text variant="caption" color="dark">
          {scaled.calories} kcal
          {entry.isEstimated ? " · Estimated" : ""}
        </Text>
      }
      modalOverlay={
        showTimePicker ? <TimePicker value={consumedAt} onChange={onTimePicked} /> : null
      }
      headerAccessory={
        entry.foodItemId ? (
          <FavoriteButton foodItemId={entry.foodItemId} size={22} hitSlop={0} />
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

          {entitlement.isLoading ? (
            <View className="h-24" />
          ) : entitlement.isPremium ? (
            macros
          ) : (
            <PremiumGate
              title="Subscribe to see macros"
              subtitle="Protein, carbs, and fat unlock with Premium."
              onViewPlans={() => router.push("/settings/subscription")}
            >
              {macros}
            </PremiumGate>
          )}

          <TimeField value={consumedAt} onPress={() => setShowTimePicker(true)} />

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
            className="min-h-touchTarget items-center justify-center"
          >
            <Text variant="body" color="error" className="font-semibold">
              {deleteLog.isPending ? "Deleting..." : "Delete entry"}
            </Text>
          </Pressable>
        </>
      ) : (
        <View className="gap-md">
          <Text variant="body" color="muted">
            {entry.servings}
            {entry.servingUnit ? ` ${entry.servingUnit}` : " serving"} ·{" "}
            {formatTime(new Date(entry.consumedAt))}
          </Text>
          {entitlement.isLoading ? (
            <View className="h-24" />
          ) : entitlement.isPremium ? (
            macros
          ) : (
            <PremiumGate
              title="Subscribe to see macros"
              subtitle="Protein, carbs, and fat unlock with Premium."
              onViewPlans={() => router.push("/settings/subscription")}
            >
              {macros}
            </PremiumGate>
          )}
          <Text variant="caption" color="muted">
            Editing is only available for entries logged today.
          </Text>
        </View>
      )}
    </BottomSheetShell>
  );
}
