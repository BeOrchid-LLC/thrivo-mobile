import { Tabs } from "expo-router";
import type { Icon } from "phosphor-react-native";
import { ChartLine, ForkKnife, Gear, House, Smiley } from "phosphor-react-native";
import { colors } from "@/theme";

/** Phosphor tab icon, filled when the tab is active (Figma tab bar). */
const tabIcon =
  (PhosphorIcon: Icon) =>
  ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <PhosphorIcon color={color} size={size} weight={focused ? "fill" : "regular"} />
  );

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
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="log" options={{ title: "Log", tabBarIcon: tabIcon(ForkKnife) }} />
      <Tabs.Screen name="metrics" options={{ title: "Metrics", tabBarIcon: tabIcon(ChartLine) }} />
      <Tabs.Screen name="checkin" options={{ title: "Check-in", tabBarIcon: tabIcon(Smiley) }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon(Gear) }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
    </Tabs>
  );
}
