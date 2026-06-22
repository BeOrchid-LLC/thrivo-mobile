import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
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
    <LinearGradient
      // First stop is the page background token; second is the soft green tint token.
      colors={[colors.light, colors.primarySoft]}
      style={{ flex: 1, paddingHorizontal: 24, paddingTop: 67, paddingBottom: 50 }}
    >
      <View className="h-[206px] items-center pt-[48px]">
        <ThrivoMark size={64} />
        <Text className="mt-md font-bold text-[28px] leading-[42px] tracking-[-0.5px] text-dark">
          THRIVO
        </Text>
        <Text className="mt-sm text-center font-regular text-[16px] leading-[24px] text-[#737373]">
          Weight loss that actually works
        </Text>
      </View>

      <View className="flex-1" />

      <View className="w-full items-center gap-md">
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
          <Text
            selectable
            className="text-center font-regular text-[13px] leading-[18px] text-error"
          >
            {error.message}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}
