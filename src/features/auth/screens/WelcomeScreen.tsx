import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThrivoMark } from "@/components";
import { getItem, setItem, storageKeys } from "@/lib/storage";
import { colors } from "@/theme";
import appleIcon from "../../../assets/auth-apple.png";
import googleIcon from "../../../assets/auth-google.png";
import emailIcon from "../../../assets/auth-magic-link.png";
import { FigmaAuthRow } from "../components/FigmaAuthRow";
import type { SocialAuthProvider } from "../components/SocialAuthButtons";
import { useAppleSignIn, useGoogleSignIn } from "../hooks/useAuth";

const SIGN_UP_ROUTE = "/(auth)/email";
const SIGN_IN_ROUTE = "/(auth)/sign-in";

type EmailRoute = typeof SIGN_UP_ROUTE | typeof SIGN_IN_ROUTE;

export function WelcomeScreen() {
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const [emailRoute, setEmailRoute] = useState<EmailRoute | null>(null);
  const loadingProvider: SocialAuthProvider | "email" | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const disabled = Boolean(loadingProvider);
  const error = google.error ?? apple.error;

  useEffect(() => {
    let cancelled = false;

    async function prepareEmailEntryRoute() {
      const hasOpened = await getItem<boolean>(storageKeys.deviceHasOpened);

      if (!cancelled) {
        setEmailRoute(hasOpened ? SIGN_IN_ROUTE : SIGN_UP_ROUTE);
      }

      await setItem(storageKeys.deviceHasOpened, true);
    }

    void prepareEmailEntryRoute();

    return () => {
      cancelled = true;
    };
  }, []);

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

        {Platform.OS === "ios" && apple.isConfigured ? (
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
          icon={emailIcon}
          label="Continue with email"
          disabled={disabled || !emailRoute}
          onPress={() => {
            if (emailRoute) router.push(emailRoute);
          }}
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
