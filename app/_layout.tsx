import { useEffect } from "react";
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
import { wireApiSeams } from "@/lib";
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

  useSessionInit();

  const ready = fontsLoaded && status !== "loading";

  useEffect(() => {
    if (!ready) return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";

    if (status === "unauthenticated" && !inAuth) {
      router.replace("/(auth)/welcome");
    } else if (status === "authenticated" && !isOnboarded && !inOnboarding) {
      router.replace("/(onboarding)/name");
    } else if (status === "authenticated" && isOnboarded && (inAuth || inOnboarding)) {
      router.replace("/(app)/dashboard");
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
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RootNavigator fontsLoaded={fontsLoaded} />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
