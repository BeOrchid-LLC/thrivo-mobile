import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persistOptions } from "@/api";
import { wireApiSeams } from "@/lib";
import { useSessionInit } from "@/hooks";
import { useAuthStatus, useIsOnboarded } from "@/stores";

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
function RootNavigator() {
  const status = useAuthStatus();
  const isOnboarded = useIsOnboarded();
  const segments = useSegments();
  const router = useRouter();

  useSessionInit();

  useEffect(() => {
    if (status === "loading") return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";

    if (status === "unauthenticated" && !inAuth) {
      router.replace("/(auth)/welcome");
    } else if (status === "authenticated" && !isOnboarded && !inOnboarding) {
      router.replace("/(onboarding)/goal");
    } else if (status === "authenticated" && isOnboarded && (inAuth || inOnboarding)) {
      router.replace("/(app)/dashboard");
    }

    void SplashScreen.hideAsync();
  }, [status, isOnboarded, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RootNavigator />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
