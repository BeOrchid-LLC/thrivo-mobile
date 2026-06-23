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
import { queryClient, persistOptions } from "@/api";
import { BrandSplash, ErrorState, Screen } from "@/components";
import { wireApiSeams, addNotificationResponseListener } from "@/lib";
import { useSessionInit } from "@/hooks";
import { useAuthStatus, useIsOnboarded, useSessionActions } from "@/stores";

// Wire the API client's token/unauthenticated seams once, at module load.
wireApiSeams();
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
  const segments = useSegments();
  const router = useRouter();
  const { setStatus } = useSessionActions();
  const redirecting = useRef(false);

  useSessionInit();

  // Route notification taps to the check-in screen.
  useEffect(() => {
    return addNotificationResponseListener((data) => {
      const target = typeof data.screen === "string" ? data.screen : "/(app)/checkin";
      router.push(target as Parameters<typeof router.push>[0]);
    });
  }, [router]);

  const ready = fontsLoaded && status !== "loading";

  useEffect(() => {
    if (!ready || redirecting.current) return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";

    let target: string | null = null;
    if (status === "unauthenticated" && !inAuth) {
      target = "/(auth)/welcome";
    } else if (status === "authenticated" && !isOnboarded && !inOnboarding) {
      target = "/(onboarding)/name";
    } else if (status === "authenticated" && isOnboarded && (inAuth || inOnboarding)) {
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
  }, [ready, status, isOnboarded, segments, router]);

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
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <RootNavigator fontsLoaded={fontsLoaded} />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
