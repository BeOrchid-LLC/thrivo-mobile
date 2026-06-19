import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Screen, Text } from "@/components";
import {
  SocialAuthButtons,
  type SocialAuthProvider,
  useAppleSignIn,
  useGoogleSignIn,
} from "@/features/auth";
import { colors, spacing } from "@/theme";

export default function Welcome() {
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const loadingProvider: SocialAuthProvider | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const error = google.error ?? apple.error;

  const onProvider = (provider: SocialAuthProvider) => {
    if (provider === "google") {
      google.mutate();
      return;
    }
    apple.mutate();
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markGlyph}>T</Text>
          </View>
          <Text variant="heading2" color="dark" style={styles.title}>
            Welcome to Thrivo
          </Text>
          <Text variant="body" color="muted" style={styles.subtitle}>
            Track food, hit your targets, and build a routine that fits your day.
          </Text>
        </View>

        <SocialAuthButtons
          onProvider={onProvider}
          disabled={Boolean(loadingProvider)}
          loadingProvider={loadingProvider}
        />

        <Button
          label="Continue with magic link"
          variant="secondary"
          disabled={Boolean(loadingProvider)}
          onPress={() => router.push("/(auth)/magic-link")}
        />

        {error ? (
          <Text variant="caption" color="error" selectable style={styles.error}>
            {error.message}
          </Text>
        ) : null}

        <Pressable onPress={() => router.push("/(auth)/sign-in")} style={styles.footer}>
          <Text variant="caption" color="muted">
            Already have an account? <Text color="primary">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingTop: spacing.xl },
  hero: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  markGlyph: { color: colors.white, fontSize: 36, fontWeight: "700", lineHeight: 42 },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
  error: { textAlign: "center" },
  footer: { alignItems: "center", marginTop: spacing.sm },
});
