import "../global.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
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
import { queryClient, persistOptions, registerOfflineMutations } from "@/api";
import { BrandSplash, ErrorState, Screen } from "@/components";
import {
  wireApiSeams,
  addNotificationResponseListener,
  initOnlineManager,
  withMonitoring,
  monitoring,
  analytics,
} from "@/lib";
import { useSessionInit, useSessionRefresh } from "@/hooks";
import { resolveRootRedirect } from "@/navigation/root-redirect";
import {
  useAuthStatus,
  useBiometricAuthEnabled,
  useIsBiometricUnlocked,
  useIsOnboarded,
  useIsOnboardingSkipped,
  usePreferencesHydrated,
  useSessionActions,
} from "@/stores";

// Start crash reporting + analytics before anything else so an early boot error
// is still captured. No-ops in dev when their env vars are unset (fail fast in prod).
monitoring.init();
analytics.init();
// Wire the API client's token/unauthenticated seams once, at module load.
wireApiSeams();
// Bridge device connectivity into React Query and register the resumable offline
// writes, so food/water/weight logging works with no network and syncs on reconnect.
initOnlineManager();
registerOfflineMutations(queryClient);
void SplashScreen.preventAutoHideAsync();

const FONT_GATE_TIMEOUT_MS = 3000;
const PREFERENCE_GATE_TIMEOUT_MS = 1000;

function bootLog(message: string): void {
  if (__DEV__) console.info(`[boot] ${message}`);
}

/**
 * The single navigation guard (MOBILE_ARCHITECTURE §5). Reads auth/onboarding
 * state and redirects to the correct group so no screen re-implements the gate:
 *   no session            → (auth)
 *   session, not onboarded → (onboarding)
 *   session + onboarded    → (app)
 */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const status = useAuthStatus();
  const biometricEnabled = useBiometricAuthEnabled();
  const isBiometricUnlocked = useIsBiometricUnlocked();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();
  const preferencesHydrated = usePreferencesHydrated();
  const [preferenceTimeoutReached, setPreferenceTimeoutReached] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const { setStatus } = useSessionActions();
  const redirecting = useRef(false);

  useSessionInit();
  useSessionRefresh();

  useEffect(() => {
    if (preferencesHydrated || status !== "authenticated") return undefined;

    const timeout = setTimeout(() => {
      bootLog("preference gate timed out; continuing without biometric startup lock");
      setPreferenceTimeoutReached(true);
    }, PREFERENCE_GATE_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [preferencesHydrated, status]);

  // Route notification taps to a usable app screen. The backend sends a stable
  // screen *key* (e.g. "checkin") so its payload never couples to Expo Router's
  // internal route paths; we map known keys here and fall back to the dashboard.
  useEffect(() => {
    const screenRoutes: Record<string, string> = {
      checkin: "/(app)/checkin",
      dashboard: "/(app)/dashboard",
      log: "/(app)/log",
    };
    return addNotificationResponseListener((data) => {
      const key = typeof data.screen === "string" ? data.screen : "";
      const target = screenRoutes[key] ?? "/(app)/dashboard";
      router.push(target as Parameters<typeof router.push>[0]);
    });
  }, [router]);

  const preferencesReady =
    status !== "authenticated" || preferencesHydrated || preferenceTimeoutReached;
  const ready = fontsReady && status !== "loading" && preferencesReady;
  const isBiometricLocked =
    status === "authenticated" && biometricEnabled && !isBiometricUnlocked && preferencesHydrated;

  useEffect(() => {
    if (!ready || redirecting.current) return;

    const group = segments[0];
    const target = resolveRootRedirect({
      group,
      status,
      isOnboarded,
      isOnboardingSkipped,
      isBiometricLocked,
    });

    bootLog(
      `guard group=${group ?? "/"} status=${status} onboarded=${isOnboarded} skipped=${isOnboardingSkipped} biometricLocked=${isBiometricLocked} target=${target ?? "none"}`
    );

    if (target) {
      redirecting.current = true;
      router.replace(target as Parameters<typeof router.replace>[0]);
      // Reset after a tick so the ref doesn't block the next state change.
      setTimeout(() => {
        redirecting.current = false;
      }, 0);
    }
  }, [
    ready,
    status,
    isOnboarded,
    isOnboardingSkipped,
    isBiometricLocked,
    segments,
    router,
  ]);

  // Hold the branded splash until fonts + auth resolve so Inter never flashes
  // the fallback face and no screen renders before the guard decides the route.
  if (!ready) {
    return <BrandSplash />;
  }

  if (status === "restore_error") {
    return (
      <Screen>
        <ErrorState
          title="Could not restore your session"
          message="Check your connection and try again."
          retryLabel="Try again"
          onRetry={() => setStatus("loading")}
        />
      </Screen>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
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

  const splashHidden = useRef(false);
  const handleRootLayout = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    // First frame is laid out (BrandSplash, since fonts/auth aren't ready yet),
    // so the native splash can drop out with nothing blank behind it.
    bootLog("first frame laid out; hiding native splash");
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={handleRootLayout}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          onSuccess={() => {
            // Cache restored from disk → flush any offline writes that were
            // queued before the last app kill.
            void queryClient.resumePausedMutations();
          }}
        >
          <RootNavigator fontsReady={fontsReady} />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry wraps the root so render errors + native crashes are captured (no-op
// passthrough when no DSN is configured).
export default withMonitoring(RootLayout);
