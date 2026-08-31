import type { ComponentType } from "react";
import { Pressable, View } from "react-native";
import { CheckIcon, Text, type IconProps } from "@/components";
import { colors } from "@/theme";

interface SelectCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Optional leading glyph rendered in a 44px tile; recolored on selection. */
  icon?: ComponentType<IconProps>;
  /** Optional trailing badge (e.g. an activity multiplier "×1.2"); replaces the check. */
  trailingText?: string;
  /**
   * "detail" (default): icon tile, label, description and a trailing check.
   * "plain": the goal frame's card — a centred label on white with a soft
   * shadow and no border until it is selected.
   */
  variant?: "detail" | "plain";
  /**
   * "default" is the S2 option card; "compact" the shorter activity row on S5
   * (64pt tall, a 36pt icon tile, and its multiplier as plain text).
   */
  size?: "default" | "compact";
}

/** Figma: 80pt tall cards, and a shadow soft enough to read as lift, not a rule. */
const PLAIN_CARD_HEIGHT = 80;
const PLAIN_CARD_SHADOW = {
  shadowColor: colors.dark,
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

/**
 * Single-select option card (Figma "Cards", V2 — node 20:240). Selected uses the
 * bright-green border + soft tint + a filled check; the leading icon tile and its
 * glyph also switch to green. Tokens only.
 */
export function SelectCard({
  label,
  description,
  selected,
  onPress,
  icon: Icon,
  trailingText,
  variant = "detail",
  size = "default",
}: SelectCardProps) {
  if (variant === "plain") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[{ height: PLAIN_CARD_HEIGHT }, PLAIN_CARD_SHADOW]}
        // The border is always there, transparent when unselected, so selecting
        // a card does not resize it.
        className={`items-center justify-center rounded-group border-2 bg-white ${
          selected ? "border-primary" : "border-transparent"
        }`}
      >
        <Text variant="body" color="dark">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // Figma S2: min-h-84, rounded-16, a 2pt Thrivo-green border over an 8%
      // tint when selected; the hairline outline on white when not.
      className={`flex-row items-center ${
        size === "compact"
          ? "h-[64px] gap-md rounded-group border-[1.333px] px-lg"
          : "min-h-[84px] gap-lg rounded-lg border-2 px-[22px] py-[18px]"
      } ${selected ? "border-primaryBright bg-primaryBright/[0.08]" : "border-hairline bg-white"}`}
    >
      {Icon ? (
        <View
          className={`items-center justify-center ${
            size === "compact" ? "h-iconMd w-iconMd rounded-md" : "h-tile w-tile rounded-tile"
          } ${selected ? "bg-primaryBright/[0.12]" : size === "compact" ? "bg-divider" : "bg-light"}`}
        >
          <Icon
            size={size === "compact" ? 20 : 24}
            color={selected ? colors.primaryBright : colors.gray[500]}
          />
        </View>
      ) : null}

      <View className="flex-1 gap-[2px]">
        <Text variant="body" color="dark" className="font-semibold">
          {label}
        </Text>
        {description ? (
          <Text variant="label" color="subtle">
            {description}
          </Text>
        ) : null}
      </View>

      {/* S5 shows the multiplier *and* the check on the selected row, so these
          are no longer alternatives. */}
      {trailingText ? (
        size === "compact" ? (
          <Text variant="caption" color={selected ? "primary" : "subtle"} className="font-medium">
            {trailingText}
          </Text>
        ) : (
          <View
            className={`rounded-md px-sm py-[2px] ${selected ? "bg-primaryBright/[0.12]" : "bg-gray-100"}`}
          >
            <Text variant="caption" color={selected ? "primary" : "gray500"}>
              {trailingText}
            </Text>
          </View>
        )
      ) : null}
      {selected ? (
        <View className="h-iconSm w-iconSm items-center justify-center rounded-pill bg-primaryBright">
          <CheckIcon size={13} />
        </View>
      ) : null}
    </Pressable>
  );
}
