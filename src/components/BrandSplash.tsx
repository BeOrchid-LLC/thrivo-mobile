import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme";
import { ThrivoMark } from "./ThrivoMark";

export interface BrandSplashProps {
  /** Show the spinner under the wordmark (e.g. while session/fonts resolve). */
  busy?: boolean;
}

/**
 * Branded loading screen shown while fonts and auth status resolve — covers the
 * window between the native splash hiding and the first real screen so there is
 * never a blank flash.
 */
export function BrandSplash({ busy = false }: BrandSplashProps) {
  return (
    <LinearGradient colors={["#F4F6F9", "#E8F7EE"]} style={styles.container}>
      <View style={styles.lockup}>
        <ThrivoMark size={80} />
        <Text style={styles.wordmark}>THRIVO</Text>
      </View>
      {busy ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockup: { alignItems: "center", height: 120 },
  wordmark: {
    marginTop: 16,
    color: colors.dark,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.44,
    lineHeight: 24,
  },
  spinner: { marginTop: 28 },
});
