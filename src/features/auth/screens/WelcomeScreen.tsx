import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { LinearGradient } from "expo-linear-gradient";
import { LockKey } from "phosphor-react-native";
import { ThrivoMark } from "@/components";
import { getItem, setItem, storageKeys } from "@/lib/storage";
import { authenticateBiometric, isBiometricAvailable } from "@/lib/biometric";
import {
  useAuthStatus,
  useBiometricAuthEnabled,
  useBiometricUnlockActions,
  useIsBiometricUnlocked,
  useIsOnboarded,
  useIsOnboardingSkipped,
} from "@/stores";
import { colors } from "@/theme";
import appleIcon from "../../../assets/auth-apple.png";
import googleIcon from "../../../assets/auth-google.png";
import emailIcon from "../../../assets/auth-magic-link.png";
import { FigmaAuthRow } from "../components/FigmaAuthRow";
import type { SocialAuthProvider } from "../components/SocialAuthButtons";
import { logAuthError, useAuthScreenDiagnostics } from "../auth-debug";
import { useAppleSignIn, useGoogleSignIn } from "../hooks/useAuth";

const SIGN_UP_ROUTE = "/(auth)/email";
const SIGN_IN_ROUTE = "/(auth)/sign-in";

type EmailRoute = typeof SIGN_UP_ROUTE | typeof SIGN_IN_ROUTE;

export function WelcomeScreen() {
  const clerk = useAuth({ treatPendingAsSignedOut: false });
  const google = useGoogleSignIn();
  const apple = useAppleSignIn();
  const status = useAuthStatus();
  const biometricEnabled = useBiometricAuthEnabled();
  const isBiometricUnlocked = useIsBiometricUnlocked();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const [emailRoute, setEmailRoute] = useState<EmailRoute | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const loadingProvider: SocialAuthProvider | "email" | null = google.isPending
    ? "google"
    : apple.isPending
      ? "apple"
      : null;
  const disabled = Boolean(loadingProvider) || biometricBusy;
  const error = google.error ?? apple.error;
  const isAuthenticated = status === "authenticated";
  useAuthScreenDiagnostics("welcome", status, clerk);
  const postUnlockTarget =
    isOnboarded || isOnboardingSkipped ? "/(app)/dashboard" : "/(onboarding)/name";
  const canUseBiometric =
    isAuthenticated && biometricEnabled && biometricAvailable && !isBiometricUnlocked;

  useEffect(() => {
    if (google.error) logAuthError("welcome", "Google SSO", google.error);
    if (apple.error) logAuthError("welcome", "Apple SSO", apple.error);
  }, [apple.error, google.error]);

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

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !biometricEnabled || isBiometricUnlocked) {
      setBiometricAvailable(false);
      return () => {
        cancelled = true;
      };
    }

    void isBiometricAvailable().then((available) => {
      if (!cancelled) setBiometricAvailable(available);
    });

    return () => {
      cancelled = true;
    };
  }, [biometricEnabled, isAuthenticated, isBiometricUnlocked]);

  useEffect(() => {
    if (!isAuthenticated || !biometricEnabled || isBiometricUnlocked || biometricAvailable) return;

    let cancelled = false;
    void isBiometricAvailable().then((available) => {
      if (cancelled || available) return;
      setBiometricUnlocked(true);
      router.replace(postUnlockTarget);
    });

    return () => {
      cancelled = true;
    };
  }, [
    biometricAvailable,
    biometricEnabled,
    isAuthenticated,
    isBiometricUnlocked,
    postUnlockTarget,
    setBiometricUnlocked,
  ]);

  const unlockWithBiometric = async () => {
    if (!canUseBiometric || biometricBusy) return;

    setBiometricBusy(true);
    try {
      if (await authenticateBiometric()) {
        setBiometricUnlocked(true);
        router.replace(postUnlockTarget);
      }
    } finally {
      setBiometricBusy(false);
    }
  };

  useEffect(() => {
    if (!canUseBiometric) return;
    void unlockWithBiometric();
    // Auto-prompt once when this welcome instance first becomes eligible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseBiometric]);

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
        <Text className="mt-sm text-center font-regular text-[16px] leading-[24px] text-muted">
          Weight loss that actually works
        </Text>
      </View>

      <View className="flex-1" />

      <View className="w-full items-center gap-md">
        {canUseBiometric ? (
          <FigmaAuthRow
            iconElement={<LockKey size={22} color={colors.dark} />}
            label="Unlock with phone"
            loading={biometricBusy}
            disabled={Boolean(loadingProvider)}
            onPress={unlockWithBiometric}
          />
        ) : null}

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
