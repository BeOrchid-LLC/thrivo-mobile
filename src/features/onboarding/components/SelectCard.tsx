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
}

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
}: SelectCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[84px] flex-row items-center gap-lg rounded-[16px] border-2 px-[22px] py-[18px] ${
        selected ? "border-primaryBright bg-primaryBright/[0.08]" : "border-gray-300 bg-white"
      }`}
    >
      {Icon ? (
        <View
          className={`h-[44px] w-[44px] items-center justify-center rounded-[12px] ${
            selected ? "bg-primaryBright/[0.12]" : "bg-light"
          }`}
        >
          <Icon size={24} color={selected ? colors.primaryBright : colors.gray[500]} />
        </View>
      ) : null}

      <View className="flex-1 gap-[2px]">
        <Text variant="body" color="dark" className="font-semibold">
          {label}
        </Text>
        {description ? (
          <Text className="font-regular text-[14px] leading-[19px] text-gray-500">
            {description}
          </Text>
        ) : null}
      </View>

      {trailingText ? (
        <View
          className={`rounded-md px-sm py-[2px] ${selected ? "bg-primaryBright/[0.12]" : "bg-gray-100"}`}
        >
          <Text
            variant="caption"
            className={`text-[13px] ${selected ? "text-primary" : "text-gray-500"}`}
          >
            {trailingText}
          </Text>
        </View>
      ) : selected ? (
        <View className="h-[22px] w-[22px] items-center justify-center rounded-pill bg-primaryBright">
          <CheckIcon size={13} />
        </View>
      ) : null}
    </Pressable>
  );
}
