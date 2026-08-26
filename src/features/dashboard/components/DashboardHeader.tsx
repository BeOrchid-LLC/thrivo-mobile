import { View } from "react-native";
import { Text } from "@/components";
import { useMe } from "@/features/profile";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const todayLabel = (): string => {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const firstName = (name?: string): string => {
  const first = name?.trim().split(/\s+/)[0];
  return first || "there";
};

/**
 * Static-first dashboard header: date paints immediately, profile enriches it.
 *
 * Date over greeting, not the `PageHeader` order — the dashboard is the one
 * screen where the date is the page's subject rather than a caption under a
 * title, and there is no back arrow to align a title row against.
 */
export function DashboardHeader() {
  const me = useMe();

  return (
    <View className="gap-xs">
      <Text variant="label" color="muted">
        {todayLabel()}
      </Text>
      <Text variant="heading3" color="dark" accessibilityRole="header">
        Hi, {firstName(me.data?.name)}
      </Text>
    </View>
  );
}
