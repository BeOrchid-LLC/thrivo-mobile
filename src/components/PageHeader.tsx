import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeftIcon } from "phosphor-react-native";
import { Text } from "./Text";
import { colors } from "@/theme";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show the back arrow beside the title. Defaults to true. */
  showBack?: boolean;
  /** Override the back behavior (defaults to router.back(), falling back to the auth welcome screen when there's no history). */
  onBack?: () => void;
}

/**
 * Standard page header: back arrow + title, optional subtitle. Used across
 * onboarding, settings, subscription, and feature screens alike so back
 * navigation and heading typography stay consistent app-wide.
 */
export function PageHeader({ title, subtitle, showBack = true, onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/welcome");
    }
  };

  const titleRow = (
    <View className="flex-row items-center gap-4">
      {showBack ? <ArrowLeftIcon size={24} color={colors.dark} /> : null}
      <Text variant="heading2" color="dark" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );

  return (
    <View className="gap-xs">
      {showBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={handleBack}>
          {titleRow}
        </Pressable>
      ) : (
        titleRow
      )}
      {subtitle ? (
        <Text variant="body" color="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
