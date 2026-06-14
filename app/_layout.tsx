import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the splash visible until the first frame is ready. In Phase 5 this is
// extended to hold until auth/onboarding state resolves and to mount providers.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
