import { Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeftIcon } from "./icons";

export interface BackButtonProps {
  /** Override the default behavior (router.back, falling back to the auth welcome screen). */
  onPress?: () => void;
}

/**
 * Shared header back affordance for the V2 auth/onboarding screens. 44×44 keeps
 * the tap target ≥44pt (WCAG 2.2 AA). Defaults to `router.back()` and falls back
 * to the welcome screen when there's no history (e.g. a magic-link cold start).
 */
export function BackButton({ onPress }: BackButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/welcome");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      // 24px box keeps the chevron aligned inline with headings; hitSlop lifts the
      // touch target to ≥44pt (WCAG 2.2 AA).
      hitSlop={12}
      className="h-[24px] w-[24px] items-center justify-center"
    >
      <ChevronLeftIcon />
    </Pressable>
  );
}
