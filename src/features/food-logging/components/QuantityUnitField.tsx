import { useState } from "react";
import { TextInput, View } from "react-native";
import { SelectInput, SelectSheet, StepperButton, Text } from "@/components";
import type { ServingChoice } from "../utils/servingChoices";

export interface QuantityUnitFieldProps {
  quantity: string;
  onQuantityChange: (value: string) => void;
  choices: ServingChoice[];
  selectedKey: string;
  onSelectChoice: (choice: ServingChoice) => void;
  disabled?: boolean;
}

/**
 * Shared quantity + unit row for LogItemSheet/EditFoodLogSheet. The unit picker
 * only renders when there's more than one real choice (e.g. a search result with
 * no known gram weight has nothing to switch to) - single-choice foods keep
 * today's plain stepper/quantity appearance.
 */
export function QuantityUnitField({
  quantity,
  onQuantityChange,
  choices,
  selectedKey,
  onSelectChoice,
  disabled,
}: QuantityUnitFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = choices.find((choice) => choice.key === selectedKey) ?? choices[0];

  return (
    <View className="gap-sm">
      <Text variant="caption" color="dark">
        Quantity
      </Text>
      <View className="flex-row items-center gap-md">
        <StepperButton
          label="-"
          size="lg"
          glyph="text"
          disabled={disabled}
          onPress={() => onQuantityChange(String(Math.max(Number(quantity) - 1, 1)))}
        />
        <TextInput
          value={quantity}
          onChangeText={onQuantityChange}
          keyboardType="numeric"
          editable={!disabled}
          className="h-[48px] flex-1 rounded-md border border-gray-300 bg-white text-center text-[18px] text-dark"
        />
        <StepperButton
          label="+"
          size="lg"
          glyph="text"
          disabled={disabled}
          onPress={() => onQuantityChange(String(Number(quantity) + 1))}
        />
      </View>
      {choices.length > 1 ? (
        <>
          <SelectInput
            label="Unit"
            value={selected?.label ?? ""}
            disabled={disabled}
            onPress={() => setPickerOpen(true)}
          />
          <SelectSheet
            title="Unit"
            options={choices.map((choice) => ({ label: choice.label, value: choice.key }))}
            value={selectedKey}
            visible={pickerOpen}
            onChange={(key) => {
              const next = choices.find((choice) => choice.key === key);
              if (next) onSelectChoice(next);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      ) : null}
    </View>
  );
}
