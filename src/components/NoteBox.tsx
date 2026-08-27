import { View } from "react-native";
import { Text } from "./Text";

export interface NoteBoxProps {
  /** Optional bolder first line. */
  title?: string;
  children: string;
}

/**
 * Amber-tinted disclaimer callout (Figma nodes 20:738 / 20:482). The amber-brown
 * tint-on-tint text is the `accentText` token; everything else uses the accent token.
 *
 * Shared rather than onboarding-local: the paywall states its cancellation
 * path in the same callout, and two copies of a disclaimer style drift.
 */
export function NoteBox({ title, children }: NoteBoxProps) {
  return (
    <View className="rounded-md border-[0.667px] border-accent/[0.18] bg-accent/[0.07] px-lg py-md">
      {title ? (
        <Text variant="caption" color="accentText">
          {title}
        </Text>
      ) : null}
      <Text variant="caption" color="accentText" className="font-medium">
        {children}
      </Text>
    </View>
  );
}
