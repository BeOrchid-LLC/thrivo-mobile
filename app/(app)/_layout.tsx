import { Tabs } from "expo-router";
import { colors } from "@/theme";

/**
 * Authenticated group (tabs). Free + premium live here; premium is a content
 * gate *within* screens, not a separate route group (MOBILE_ARCHITECTURE §5).
 * `foods` is reachable by push but hidden from the tab bar (href: null).
 */
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="log" options={{ title: "Log" }} />
      <Tabs.Screen name="metrics" options={{ title: "Metrics" }} />
      <Tabs.Screen name="checkin" options={{ title: "Check-in" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
    </Tabs>
  );
}
