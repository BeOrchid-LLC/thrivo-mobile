import { Stack } from "expo-router";
import { popOnlyScreenListeners, popOnlyScreenOptions } from "@/navigation/pop-animation";

/**
 * Authenticated group. A stack whose root is the tab navigator, so the screens
 * reached *from* a tab (food history, water history, check-in) push over the
 * tab bar and pop back with the standard slide.
 *
 * They used to be `href: null` tab screens, which meant `router.push` was really
 * a tab switch: no push/pop, no back animation, and `router.canGoBack()` false
 * — the reason those screens still carry `router.replace` fallbacks in their
 * back handlers.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={popOnlyScreenOptions} screenListeners={popOnlyScreenListeners}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="history" />
      <Stack.Screen name="water-history" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="foods" />
    </Stack>
  );
}
