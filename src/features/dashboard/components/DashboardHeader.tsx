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

/** Static-first dashboard header: date paints immediately, profile enriches it. */
export function DashboardHeader() {
  const me = useMe();

  return (
    <View className="mb-xs">
      <Text variant="heading2" color="dark">
        Hi, {firstName(me.data?.name)}
      </Text>
      <Text variant="body" color="muted">
        {todayLabel()}
      </Text>
    </View>
  );
}
