import "../global.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ClerkProvider, useAuth, useClerk } from "@clerk/expo";
import { queryClient, persistOptions, registerOfflineMutations } from "@/api";
import { setTokenGetter, setTokenRefresher } from "@/api/auth-token";
import { BrandSplash, ErrorState, Screen, ToastProvider } from "@/components";
import {
  wireApiSeams,
  wireClerkSignOut,
  addNotificationResponseListener,
  initOnlineManager,
  withMonitoring,
  monitoring,
  analytics,
  clerkTokenCache,
} from "@/lib";
import { env } from "@/config/env";
import {
  useBillingSync,
  useHasDismissedOnboarding,
  usePushRegistration,
  useReminderScheduling,
  useSessionInit,
  useSessionRefresh,
  useTimezoneSync,
} from "@/hooks";
import { popOnlyScreenListeners, popOnlyScreenOptions } from "@/navigation/pop-animation";
import { resolveRootRedirect } from "@/navigation/root-redirect";
import {
  consumePendingDeepLink,
  parseAppDeepLink,
  savePendingDeepLink,
} from "@/navigation/pending-deep-link";
import { colors } from "@/theme";
import {
  useAuthStatus,
  useRestoreError,
  useBiometricAuthEnabled,
  useIsBiometricUnlocked,
  useIsOnboarded,
  useIsOnboardingSkipped,
  usePreferencesActions,
  usePreferencesHydrated,
  useSessionActions,
  useUserId,
} from "@/stores";

wireApiSeams();
initOnlineManager();
registerOfflineMutations(queryClient);
void SplashScreen.preventAutoHideAsync();

const FONT_GATE_TIMEOUT_MS = 3000;
const PREFERENCE_GATE_TIMEOUT_MS = 1000;
const NATIVE_SPLASH_EXIT_SETTLE_MS = 250;
const SPLASH_HANDOFF_TIMEOUT_MS = 2000;

function bootLog(message: string): void {
  if (__DEV__) console.info(`[boot] ${message}`);
}

/**
 * Bridges Clerk's token getter and sign-out into the API client seams.
 * Must be inside ClerkProvider so the Clerk hooks are available.
 */
function ClerkTokenBridge() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    setTokenGetter(() => getToken());
    setTokenRefresher(() => getToken({ skipCache: true }));
    wireClerkSignOut(() => signOut());
    return () => setTokenRefresher(null);
  }, [getToken, signOut]);

  return null;
}

function RootNavigator({
  fontsReady,
  nativeSplashReleased,
  neutralBackground,
}: {
  fontsReady: boolean;
  nativeSplashReleased: boolean;
  neutralBackground: string;
}) {
  const status = useAuthStatus();
  const restoreError = useRestoreError();
  const biometricEnabled = useBiometricAuthEnabled();
  const isBiometricUnlocked = useIsBiometricUnlocked();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();
  const hasDismissedOnboarding = useHasDismissedOnboarding();
  const userId = useUserId();
  const { markOnboardingDismissed } = usePreferencesActions();
  const preferencesHydrated = usePreferencesHydrated();
  const [preferenceTimeoutReached, setPreferenceTimeoutReached] = useState(false);
  const [pendingLinkVersion, setPendingLinkVersion] = useState(0);
  const segments = useSegments();
  const router = useRouter();
  const { setStatus, clearSession } = useSessionActions();
  const { signOut: clerkSignOut } = useClerk();
  const redirecting = useRef(false);

  useSessionInit();
  useSessionRefresh();
  useBillingSync();
  useTimezoneSync();
  usePushRegistration();
  useReminderScheduling();

  useEffect(() => {
    const capture = async (url: string | null) => {
      if (!url) return;
      const target = parseAppDeepLink(url);
      if (target) {
        await savePendingDeepLink(target);
        setPendingLinkVersion((version) => version + 1);
      }
    };
    void Linking.getInitialURL().then(capture);
    const subscription = Linking.addEventListener("url", ({ url }) => void capture(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (preferencesHydrated || status !== "authenticated") return undefined;

    const timeout = setTimeout(() => {
      bootLog("preference gate timed out; continuing without biometric startup lock");
      setPreferenceTimeoutReached(true);
    }, PREFERENCE_GATE_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [preferencesHydrated, status]);

  useEffect(() => {
    const screenRoutes: Record<string, string> = {
      checkin: "/(app)/checkin",
      dashboard: "/(app)/(tabs)/dashboard",
      log: "/(app)/(tabs)/log",
    };
    return addNotificationResponseListener((data) => {
      const key = typeof data.screen === "string" ? data.screen : "";
      const target = screenRoutes[key] ?? "/(app)/(tabs)/dashboard";
      router.push(target as Parameters<typeof router.push>[0]);
    });
  }, [router]);

  const preferencesReady =
    status !== "authenticated" || preferencesHydrated || preferenceTimeoutReached;
  const ready = fontsReady && status !== "loading" && preferencesReady;
  const isBiometricLocked =
    status === "authenticated" && biometricEnabled && !isBiometricUnlocked && preferencesHydrated;

  useEffect(() => {
    if (
      !ready ||
      !nativeSplashReleased ||
      status !== "authenticated" ||
      (!isOnboarded && !isOnboardingSkipped && !hasDismissedOnboarding) ||
      isBiometricLocked
    ) {
      return;
    }
    void consumePendingDeepLink().then((target) => {
      if (target) router.replace(target);
    });
  }, [
    ready,
    nativeSplashReleased,
    status,
    isOnboarded,
    isOnboardingSkipped,
    hasDismissedOnboarding,
    isBiometricLocked,
    pendingLinkVersion,
    router,
  ]);

  /**
   * Onboarding is a one-time gate. The moment someone is through to `(app)` —
   * having finished it, skipped it, or arrived already onboarded — record it so
   * no later launch can route them back into the flow. Settings is the way back
   * in from here.
   */
  useEffect(() => {
    if (status !== "authenticated" || !userId || isBiometricLocked) return;
    if (segments[0] !== "(app)") return;
    markOnboardingDismissed(userId);
  }, [status, userId, isBiometricLocked, segments, markOnboardingDismissed]);

  useEffect(() => {
    if (!ready || !nativeSplashReleased || redirecting.current) return;

    const group = segments[0];
    const target = resolveRootRedirect({
      group,
      status,
      isOnboarded,
      isOnboardingSkipped,
      isBiometricLocked,
      hasDismissedOnboarding,
    });

    bootLog(
      `guard group=${group ?? "/"} status=${status} onboarded=${isOnboarded} skipped=${isOnboardingSkipped} dismissed=${hasDismissedOnboarding} biometricLocked=${isBiometricLocked} target=${target ?? "none"}`
    );

    if (target) {
      redirecting.current = true;
      router.replace(target as Parameters<typeof router.replace>[0]);
      setTimeout(() => {
        redirecting.current = false;
      }, 0);
    }
  }, [
    nativeSplashReleased,
    ready,
    status,
    isOnboarded,
    isOnboardingSkipped,
    hasDismissedOnboarding,
    isBiometricLocked,
    segments,
    router,
  ]);

  if (!nativeSplashReleased) {
    return <View style={{ flex: 1, backgroundColor: neutralBackground }} />;
  }

  if (!ready) {
    return <BrandSplash />;
  }

  if (status === "restore_error") {
    return (
      <Screen>
        <ErrorState
          title="Could not restore your session"
          message={
            restoreError
              ? `Check your connection and try again.\n\n${restoreError}`
              : "Check your connection and try again."
          }
          retryLabel="Try again"
          onRetry={() => setStatus("loading")}
          // Escape hatch. Some restore failures cannot be retried away — a
          // deleted account, a revoked session, a backend that stays down — and
          // without this the only screen the user can reach is one whose single
          // button never succeeds.
          secondaryLabel="Sign out"
          onSecondary={() => {
            void clerkSignOut().catch(() => undefined);
            clearSession();
          }}
        />
      </Screen>
    );
  }

  return <Stack screenOptions={popOnlyScreenOptions} screenListeners={popOnlyScreenListeners} />;
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [fontTimeoutReached, setFontTimeoutReached] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) return undefined;

    const timeout = setTimeout(() => {
      bootLog("font gate timed out; continuing with fallback font");
      setFontTimeoutReached(true);
    }, FONT_GATE_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [fontError, fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) bootLog("fonts loaded");
    if (fontError) bootLog("font load failed; continuing with fallback font");
  }, [fontError, fontsLoaded]);

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimeoutReached;
  const [nativeSplashReleased, setNativeSplashReleased] = useState(false);

  useEffect(() => {
    monitoring.init();
    analytics.init();
  }, []);

  const splashHandoffStarted = useRef(false);
  const handleRootLayout = useCallback(() => {
    if (splashHandoffStarted.current) return;
    splashHandoffStarted.current = true;
    bootLog("neutral frame laid out; hiding native splash");

    void SplashScreen.hideAsync()
      .then(() => {
        const release = () => {
          bootLog("native splash exit settled; releasing React splash handoff");
          setNativeSplashReleased(true);
        };

        if (Platform.OS === "android") {
          setTimeout(release, NATIVE_SPLASH_EXIT_SETTLE_MS);
        } else {
          requestAnimationFrame(release);
        }
      })
      .catch((error: unknown) => {
        bootLog(`native splash hide failed; releasing handoff: ${String(error)}`);
        setNativeSplashReleased(true);
      });
  }, []);

  // The handoff hangs on two things outside our control: `onLayout` firing at
  // all, and `hideAsync()` settling. Neither is guaranteed on every device, and
  // if either stalls, `nativeSplashReleased` stays false and RootNavigator is
  // pinned on the blank neutral frame forever — a boot that never finishes, with
  // no error to show for it. Same watchdog shape as the font/preference gates.
  useEffect(() => {
    if (nativeSplashReleased) return undefined;

    const timeout = setTimeout(() => {
      bootLog("splash handoff timed out; releasing without onLayout");
      splashHandoffStarted.current = true;
      void SplashScreen.hideAsync().catch(() => undefined);
      setNativeSplashReleased(true);
    }, SPLASH_HANDOFF_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [nativeSplashReleased]);

  // `app.json` sets userInterfaceStyle: "light", so iOS reports Light regardless
  // of the system setting and the dark branch this used to have was unreachable.
  // Reintroduce a scheme check only alongside a real dark palette — `src/theme`
  // has one palette today and Tailwind has no darkMode configured.
  const neutralBackground = colors.light;

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={clerkTokenCache}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: neutralBackground }}
        onLayout={handleRootLayout}
      >
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
            onSuccess={() => {
              void queryClient.resumePausedMutations();
            }}
          >
            <BottomSheetModalProvider>
              <ToastProvider>
                <ClerkTokenBridge />
                <RootNavigator
                  fontsReady={fontsReady}
                  nativeSplashReleased={nativeSplashReleased}
                  neutralBackground={neutralBackground}
                />
              </ToastProvider>
            </BottomSheetModalProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}

export default withMonitoring(RootLayout);
