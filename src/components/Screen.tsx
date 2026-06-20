import type { ReactNode } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default false for fixed layouts). */
  scroll?: boolean;
  /** Safe-area edges to apply. Defaults to all. */
  edges?: readonly Edge[];
  /** Apply default horizontal+vertical padding (default true). */
  padded?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
}

/**
 * Base screen container: safe-area aware + themed background. Every screen
 * renders inside a Screen so status-bar insets are never hardcoded
 * (MOBILE_ARCHITECTURE §7). SafeAreaView is a third-party wrapper, so its
 * background (a runtime prop) stays a token-sourced style.
 */
export function Screen({
  children,
  scroll = false,
  edges = ["top", "bottom", "left", "right"],
  padded = true,
  style,
  backgroundColor = colors.light,
}: ScreenProps) {
  const padding: ViewStyle | undefined = padded
    ? { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[padding, style]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1" style={[padding, style]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
