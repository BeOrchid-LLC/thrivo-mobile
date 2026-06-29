import { View } from "react-native";
import { Text } from "@/components";

interface NoteBoxProps {
  /** Optional bolder first line. */
  title?: string;
  children: string;
}

/**
 * Amber-tinted disclaimer callout (Figma nodes 20:738 / 20:482). The amber-brown
 * tint-on-tint text is the `accentText` token; everything else uses the accent token.
 */
export function NoteBox({ title, children }: NoteBoxProps) {
  return (
    <View className="rounded-[10px] border-[0.667px] border-accent/[0.18] bg-accent/[0.07] px-lg py-md">
      {title ? (
        <Text className="font-semibold text-[13px] leading-[19px] text-accentText">{title}</Text>
      ) : null}
      <Text className="font-medium text-[13px] leading-[19px] text-accentText">{children}</Text>
    </View>
  );
}
