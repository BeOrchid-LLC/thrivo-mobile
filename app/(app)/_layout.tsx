import { Tabs } from "expo-router";
import type { Icon } from "phosphor-react-native";
import { ChartLine, ForkKnife, Gear, House } from "phosphor-react-native";
import { BiometricGate } from "@/features/security";
import { colors } from "@/theme";

/** Phosphor tab icon, filled when the tab is active (Figma tab bar). */
const tabIcon = (PhosphorIcon: Icon) => {
  const TabBarIcon = ({
    color,
    focused,
    size,
  }: {
    color: string;
    focused: boolean;
    size: number;
  }) => <PhosphorIcon color={color} size={size} weight={focused ? "fill" : "regular"} />;
  TabBarIcon.displayName = "TabBarIcon";
  return TabBarIcon;
};

/**
 * Authenticated group (tabs). Free + premium live here; premium is a content
 * gate *within* screens, not a separate route group (MOBILE_ARCHITECTURE §5).
 * `foods` is reachable by push but hidden from the tab bar (href: null).
 */
export default function AppLayout() {
  return (
    <BiometricGate>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon(House),
          tabBarAccessibilityLabel: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log Food",
          tabBarIcon: tabIcon(ForkKnife),
          tabBarAccessibilityLabel: "Log food",
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: "Progress",
          tabBarIcon: tabIcon(ChartLine),
          tabBarAccessibilityLabel: "Progress",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: tabIcon(Gear),
          tabBarAccessibilityLabel: "Settings",
        }}
      />
      <Tabs.Screen name="foods" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
      </Tabs>
    </BiometricGate>
  );
}
