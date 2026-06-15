import { Platform, StyleSheet, View } from "react-native";
import { Button } from "@/components";
import { spacing } from "@/theme";
import type { DemoAuthProvider } from "../hooks/useDemoAuth";

interface SocialAuthButtonsProps {
  onProvider: (provider: DemoAuthProvider) => void;
  disabled?: boolean;
}

/**
 * Social sign-in buttons with the platform matrix in one place: **Google on both
 * platforms**, **Apple on iOS only** (Sign in with Apple isn't offered on
 * Android). Icons are added in the dashboard phase alongside the Phosphor set.
 */
export function SocialAuthButtons({ onProvider, disabled }: SocialAuthButtonsProps) {
  return (
    <View style={styles.group}>
      <Button
        label="Continue with Google"
        variant="secondary"
        disabled={disabled}
        onPress={() => onProvider("google")}
      />
      {Platform.OS === "ios" ? (
        <Button
          label="Continue with Apple"
          variant="secondary"
          disabled={disabled}
          onPress={() => onProvider("apple")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
});
