import { Platform, StyleSheet, View } from "react-native";
import { Button } from "@/components";
import { spacing } from "@/theme";

export type SocialAuthProvider = "google" | "apple";

interface SocialAuthButtonsProps {
  onProvider: (provider: SocialAuthProvider) => void;
  disabled?: boolean;
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
  loadingProvider = null,
}: SocialAuthButtonsProps) {
  return (
    <View style={styles.group}>
      <Button
        label="Continue with Google"
        variant="secondary"
        disabled={disabled}
        loading={loadingProvider === "google"}
        onPress={() => onProvider("google")}
      />
      {Platform.OS === "ios" ? (
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

const styles = StyleSheet.create({
  group: { gap: spacing.md },
});
