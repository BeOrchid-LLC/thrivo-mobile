import { Platform, View } from "react-native";
import { Button } from "@/components";

export type SocialAuthProvider = "google" | "apple";

interface SocialAuthButtonsProps {
  onProvider: (provider: SocialAuthProvider) => void;
  disabled?: boolean;
  hiddenProviders?: SocialAuthProvider[];
  loadingProvider?: SocialAuthProvider | null;
}

/**
 * Social sign-in buttons with the platform matrix in one place: **Google on both
 * platforms**, **Apple on iOS only** (Sign in with Apple isn't offered on
 * Android).
 */
export function SocialAuthButtons({
  onProvider,
  disabled,
  hiddenProviders = [],
  loadingProvider = null,
}: SocialAuthButtonsProps) {
  const showGoogle = !hiddenProviders.includes("google");
  const showApple = Platform.OS === "ios" && !hiddenProviders.includes("apple");

  if (!showGoogle && !showApple) return null;

  return (
    <View className="gap-md">
      {showGoogle ? (
        <Button
          label="Continue with Google"
          variant="secondary"
          disabled={disabled}
          loading={loadingProvider === "google"}
          onPress={() => onProvider("google")}
        />
      ) : null}
      {showApple ? (
        <Button
          label="Continue with Apple"
          variant="secondary"
          disabled={disabled}
          loading={loadingProvider === "apple"}
          onPress={() => onProvider("apple")}
        />
      ) : null}
    </View>
  );
}
