import { ActivityIndicator, Text, View } from "react-native";
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
 * never a blank flash. LinearGradient is a third-party wrapper, so layout/colors
 * stay token-sourced props rather than className.
 */
export function BrandSplash({ busy = false }: BrandSplashProps) {
  return (
    <LinearGradient
      // First stop is the page background token; second is a soft green tint.
      colors={[colors.light, "#E8F7EE"]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <View className="h-[120px] items-center">
        <ThrivoMark size={80} />
        <Text className="mt-lg text-[20px] font-bold leading-[24px] tracking-[0.44px] text-dark">
          THRIVO
        </Text>
      </View>
      {busy ? <ActivityIndicator color={colors.primary} className="mt-[28px]" /> : null}
    </LinearGradient>
  );
}
