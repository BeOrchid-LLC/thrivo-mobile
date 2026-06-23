import { Tabs } from "expo-router";
import type { Icon } from "phosphor-react-native";
import { ChartLine, ForkKnife, Gear, House, Smiley } from "phosphor-react-native";
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: tabIcon(House), tabBarAccessibilityLabel: "Home" }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: tabIcon(ForkKnife),
          tabBarAccessibilityLabel: "Log food",
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: "Metrics",
          tabBarIcon: tabIcon(ChartLine),
          tabBarAccessibilityLabel: "Metrics",
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-in",
          tabBarIcon: tabIcon(Smiley),
          tabBarAccessibilityLabel: "Daily check-in",
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
    </Tabs>
  );
}
