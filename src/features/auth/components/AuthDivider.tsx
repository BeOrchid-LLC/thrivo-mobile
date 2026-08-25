import { View } from "react-native";
import { Text } from "@/components";

export interface AuthDividerProps {
  label?: string;
}

/** Hairline rule with a centred label — the "OR" separator on the sign-in screen. */
export function AuthDivider({ label = "OR" }: AuthDividerProps) {
  return (
    // The label's 24pt line box sits taller than the rule it centres, so the
    // row pulls up to keep the Figma gap under the button above it.
    <View className="flex-row items-center gap-md" style={{ marginTop: -4 }}>
      <View className="h-[1px] flex-1 bg-gray-200" />
      <Text variant="body" color="dark">
        {label}
      </Text>
      <View className="h-[1px] flex-1 bg-gray-200" />
    </View>
  );
}
