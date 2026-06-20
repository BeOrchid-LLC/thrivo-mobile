import { ActivityIndicator, View } from "react-native";
import { colors } from "@/theme";
import { Text } from "./Text";

export interface LoadingStateProps {
  message?: string;
}

/**
 * Centered loading indicator. Every data-fetching screen renders this while a
 * query is pending — never a blank flash (MOBILE_ARCHITECTURE §7).
 */
export function LoadingState({ message }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-md" accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <Text variant="caption" color="muted" className="mt-sm">
          {message}
        </Text>
      ) : null}
    </View>
  );
}
