import { Pressable } from "react-native";
import { Minus, Plus } from "phosphor-react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface StepperButtonProps {
  label: "-" | "+";
  onPress: () => void;
  /** Visual chrome size — 28px (compact inline rows) or 40px (bottom sheets). */
  size?: "sm" | "lg";
  /** icon = phosphor Minus/Plus (compact screens); text = "+"/"-" glyph (sheets). */
  glyph?: "icon" | "text";
  disabled?: boolean;
}

const BOX_SIZE: Record<NonNullable<StepperButtonProps["size"]>, number> = { sm: 28, lg: 40 };
/** WCAG 2.2 AA / house-rule minimum tap target. */
const MIN_TAP_TARGET = 44;

/**
 * R6 (I22): one stepper button, not four drifted copies. Both visual sizes
 * meet the 44pt tap-target budget via `hitSlop` rather than growing the
 * visible chrome past what fits each row's layout.
 */
export function StepperButton({
  label,
  onPress,
  size = "sm",
  glyph = "icon",
  disabled = false,
}: StepperButtonProps) {
  const box = BOX_SIZE[size];
  const hitSlop = Math.max(0, Math.ceil((MIN_TAP_TARGET - box) / 2));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "-" ? "Decrease" : "Increase"}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={{ height: box, width: box }}
      className={`items-center justify-center rounded-sm border border-gray-200 bg-primarySoft ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {glyph === "icon" ? (
        label === "-" ? (
          <Minus size={16} color={colors.primary} />
        ) : (
          <Plus size={16} color={colors.primary} />
        )
      ) : (
        <Text variant="body" color="primary" className="font-semibold">
          {label}
        </Text>
      )}
    </Pressable>
  );
}
