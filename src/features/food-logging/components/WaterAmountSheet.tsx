import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Backspace } from "phosphor-react-native";
import { BottomSheetShell, Button, FormError, Text } from "@/components";
import { colors } from "@/theme";
import { formatWater, roundTo, waterFromMl, waterToMl, waterUnitFor } from "@/utils";

const MAX_WATER_ML = 5000;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

export interface WaterAmountSheetProps {
  visible: boolean;
  title: string;
  submitLabel: string;
  initialAmountMl: number;
  unitSystem: "metric" | "imperial";
  initialRecordedAt?: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: { amountMl: number; recordedAt?: string }) => void;
}

function formatAmountInput(ml: number, unitSystem: "metric" | "imperial"): string {
  return String(roundTo(waterFromMl(ml, unitSystem), unitSystem === "imperial" ? 1 : 0));
}

function formatAmountDisplay(value: string, unitSystem: "metric" | "imperial"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  return roundTo(amount, unitSystem === "imperial" ? 1 : 0).toLocaleString();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function mergeTime(base: Date, picked: Date): Date {
  const next = new Date(base);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

export function WaterAmountSheet({
  visible,
  title,
  submitLabel,
  initialAmountMl,
  unitSystem,
  initialRecordedAt,
  loading = false,
  error,
  onClose,
  onSubmit,
}: WaterAmountSheetProps) {
  const [amount, setAmount] = useState(formatAmountInput(initialAmountMl, unitSystem));
  const [recordedAt, setRecordedAt] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const unit = waterUnitFor(unitSystem);
  const numericAmount = Number(amount);
  const amountMl = Math.round(waterToMl(numericAmount, unitSystem));
  const isValid =
    Number.isFinite(numericAmount) && numericAmount > 0 && amountMl > 0 && amountMl <= MAX_WATER_ML;
  const displayAmount = useMemo(
    () => formatAmountDisplay(amount, unitSystem),
    [amount, unitSystem]
  );

  useEffect(() => {
    if (!visible) return;
    setAmount(formatAmountInput(initialAmountMl, unitSystem));
    setRecordedAt(initialRecordedAt ? new Date(initialRecordedAt) : new Date());
    setShowTimePicker(false);
  }, [initialAmountMl, initialRecordedAt, unitSystem, visible]);

  const pressKey = (key: string) => {
    setAmount((current) => {
      if (key === "backspace") return current.length > 1 ? current.slice(0, -1) : "";
      if (key === "." && (unitSystem === "metric" || current.includes("."))) return current;
      if (current === "0" && key !== ".") return key;
      if (current.length >= 6) return current;
      return `${current}${key}`;
    });
  };

  const onTimePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !date) return;
    setRecordedAt((current) => mergeTime(current, date));
  };

  const submit = () => {
    if (!isValid) return;
    onSubmit({
      amountMl,
      recordedAt: initialRecordedAt ? recordedAt.toISOString() : undefined,
    });
  };

  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      title={title}
      closeLabel={`Close ${title}`}
      modalOverlay={
        showTimePicker ? (
          <DateTimePicker
            mode="time"
            display="spinner"
            value={recordedAt}
            onChange={onTimePicked}
          />
        ) : null
      }
    >
      <View className="items-center gap-xs">
        <View className="flex-row items-end gap-xs py-xs">
          <Text className="font-semibold text-[24px] leading-[32px] text-dark">
            {displayAmount}
          </Text>
          <Text variant="caption" color="muted" className="pb-[3px]">
            {unit}
          </Text>
        </View>
      </View>

      {initialRecordedAt ? (
        <View className="gap-sm">
          <Text variant="caption" color="dark">
            Time logged
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change water time logged"
            onPress={() => setShowTimePicker(true)}
            className="h-[48px] items-center justify-center rounded-md border border-gray-300 bg-white"
          >
            <Text variant="body" color="dark">
              {formatTime(recordedAt)}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="gap-xs">
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row gap-xs">
            {KEYS.slice(row * 3, row * 3 + 3).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === "backspace" ? "Delete digit" : `Water amount ${key}`}
                onPress={() => pressKey(key)}
                className="h-[36px] flex-1 items-center justify-center rounded-md bg-primarySoft"
              >
                {key === "backspace" ? (
                  <Backspace size={18} color={colors.dark} />
                ) : (
                  <Text variant="body" color="dark">
                    {key}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {!isValid ? (
        <FormError message={`Enter an amount up to ${formatWater(MAX_WATER_ML, unitSystem)}.`} />
      ) : null}
      <FormError message={error ?? null} />

      <Button label={submitLabel} loading={loading} disabled={!isValid} onPress={submit} />
    </BottomSheetShell>
  );
}
