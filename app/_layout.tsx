import "../global.css";
import { useEffect, useRef } from "react";
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
import { wireApiSeams, addNotificationResponseListener, initOnlineManager } from "@/lib";
import { useSessionInit, useSessionRefresh } from "@/hooks";
import { useAuthStatus, useIsOnboarded, useIsOnboardingSkipped, useSessionActions } from "@/stores";

// Wire the API client's token/unauthenticated seams once, at module load.
wireApiSeams();
// Bridge device connectivity into React Query and register the resumable offline
// writes, so food/water/weight logging works with no network and syncs on reconnect.
initOnlineManager();
registerOfflineMutations(queryClient);
void SplashScreen.preventAutoHideAsync();

/**
 * The single navigation guard (MOBILE_ARCHITECTURE §5). Reads auth/onboarding
 * state and redirects to the correct group so no screen re-implements the gate:
 *   no session            → (auth)
 *   session, not onboarded → (onboarding)
 *   session + onboarded    → (app)
 */
function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const status = useAuthStatus();
  const isOnboarded = useIsOnboarded();
  const isOnboardingSkipped = useIsOnboardingSkipped();
  const segments = useSegments();
  const router = useRouter();
  const { setStatus } = useSessionActions();
  const redirecting = useRef(false);

  useSessionInit();
  useSessionRefresh();

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

  const ready = fontsLoaded && status !== "loading";

  useEffect(() => {
    if (!ready || redirecting.current) return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";
    // OAuth deep-link handler: routes itself after applying tokens; exclude from guard.
    const inAuthCallback = group === "auth";

    let target: string | null = null;
    if (status === "unauthenticated" && !inAuth && !inAuthCallback) {
      target = "/(auth)/welcome";
    } else if (
      status === "authenticated" &&
      !isOnboarded &&
      !isOnboardingSkipped &&
      !inOnboarding &&
      !inAuthCallback
    ) {
      target = "/(onboarding)/name";
    } else if (
      status === "authenticated" &&
      (isOnboarded || isOnboardingSkipped) &&
      (inAuth || inOnboarding)
    ) {
      target = "/(app)/dashboard";
    }

    if (target) {
      redirecting.current = true;
      router.replace(target as Parameters<typeof router.replace>[0]);
      // Reset after a tick so the ref doesn't block the next state change.
      setTimeout(() => {
        redirecting.current = false;
      }, 0);
    }

    void SplashScreen.hideAsync();
  }, [ready, status, isOnboarded, isOnboardingSkipped, segments, router]);

  if (!fontsLoaded) {
    return null;
  }

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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          <RootNavigator fontsLoaded={fontsLoaded} />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
