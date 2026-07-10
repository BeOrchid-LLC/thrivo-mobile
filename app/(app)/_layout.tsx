import { Tabs, router } from "expo-router";
import type { Icon } from "phosphor-react-native";
import { ChartLineUp, ChartPieSlice, Scan, UserGear } from "phosphor-react-native";
import { emitTabRootReset } from "@/navigation/tab-root-reset";
import type { AppTabParamList } from "@/navigation/types";
import { colors } from "@/theme";

type VisibleTab = keyof Pick<AppTabParamList, "dashboard" | "log" | "metrics" | "settings">;

const tabRootHref: Record<VisibleTab, string> = {
  dashboard: "/(app)/dashboard",
  log: "/(app)/log",
  metrics: "/(app)/metrics",
  settings: "/(app)/settings",
};

function tabRootListeners(tab: VisibleTab) {
  return {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      emitTabRootReset(tab);
      router.replace(tabRootHref[tab] as Parameters<typeof router.replace>[0]);
    },
  };
}

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
        listeners={tabRootListeners("dashboard")}
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon(ChartPieSlice),
          tabBarAccessibilityLabel: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="log"
        listeners={tabRootListeners("log")}
        options={{
          title: "Log Food",
          tabBarIcon: tabIcon(Scan),
          tabBarAccessibilityLabel: "Log food",
        }}
      />
      <Tabs.Screen
        name="metrics"
        listeners={tabRootListeners("metrics")}
        options={{
          title: "Progress",
          tabBarIcon: tabIcon(ChartLineUp),
          tabBarAccessibilityLabel: "Progress",
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={tabRootListeners("settings")}
        options={{
          title: "Settings",
          tabBarIcon: tabIcon(UserGear),
          tabBarAccessibilityLabel: "Settings",
        }}
      />
      <Tabs.Screen name="foods" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
    </Tabs>
  );
}
