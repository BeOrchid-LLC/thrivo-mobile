import { router } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThrivoMark } from "@/components";
import {
  FigmaAuthRow,
  type SocialAuthProvider,
  useAppleSignIn,
  useGoogleSignIn,
} from "@/features/auth";
import { colors } from "@/theme";
import appleIcon from "../../src/assets/auth-apple.png";
import googleIcon from "../../src/assets/auth-google.png";
import magicLinkIcon from "../../src/assets/auth-magic-link.png";

export default function Welcome() {
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const loadingProvider: SocialAuthProvider | "magic-link" | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const disabled = Boolean(loadingProvider);
  const error = google.error ?? apple.error;

  return (
    <LinearGradient colors={["#F4F6F9", "#E8F7EE"]} style={styles.screen}>
      <View style={styles.hero}>
        <ThrivoMark size={64} />
        <Text style={styles.wordmark}>THRIVO</Text>
        <Text style={styles.tagline}>Weight loss that actually works</Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.authGroup}>
        {google.isConfigured ? (
          <FigmaAuthRow
            icon={googleIcon}
            label="Sign in with Google"
            loading={loadingProvider === "google"}
            disabled={disabled}
            onPress={() => google.mutate()}
          />
        ) : null}

        {Platform.OS === "ios" ? (
          <FigmaAuthRow
            icon={appleIcon}
            iconSize={24}
            label="Sign in with Apple"
            loading={loadingProvider === "apple"}
            disabled={disabled}
            onPress={() => apple.mutate()}
          />
        ) : null}

        <FigmaAuthRow
          icon={magicLinkIcon}
          label="Continue with magic link"
          disabled={disabled}
          onPress={() => router.push("/(auth)/magic-link")}
        />

        {error ? (
          <Text selectable style={styles.error}>
            {error.message}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 67,
    paddingBottom: 50,
  },
  hero: {
    height: 206,
    alignItems: "center",
    paddingTop: 48,
  },
  wordmark: {
    marginTop: 12,
    color: colors.dark,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  tagline: {
    marginTop: 8,
    color: "#737373",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    textAlign: "center",
  },
  spacer: { flex: 1 },
  authGroup: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  error: {
    color: colors.error,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
