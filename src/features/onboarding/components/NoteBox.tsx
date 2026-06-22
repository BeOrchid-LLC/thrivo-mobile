import { View } from "react-native";
import { Text } from "@/components";

interface NoteBoxProps {
  /** Optional bolder first line. */
  title?: string;
  children: string;
}

/**
 * Amber-tinted disclaimer callout (Figma nodes 20:738 / 20:482). The amber-brown
 * text (#8A6A2A) is a tint-on-tint value with no token equivalent; everything
 * else uses the accent token.
 */
export function NoteBox({ title, children }: NoteBoxProps) {
  return (
    <View className="rounded-[10px] border-[0.667px] border-accent/[0.18] bg-accent/[0.07] px-lg py-md">
      {title ? (
        <Text className="font-semibold text-[13px] leading-[19px] text-[#8a6a2a]">{title}</Text>
      ) : null}
      <Text className="font-medium text-[13px] leading-[19px] text-[#8a6a2a]">{children}</Text>
    </View>
  );
}
