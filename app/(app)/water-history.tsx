import { useState } from "react";
import { queryClient, queryKeys } from "@/api";
import { Screen } from "@/components";
import { WaterHistoryScreen } from "@/features/food-logging";

export default function WaterHistory() {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    void queryClient
      .invalidateQueries({ queryKey: queryKeys.metrics.waterHistoryRoot() })
      .finally(() => setRefreshing(false));
  };

  return (
    <Screen edges={["top", "left", "right"]} style={{ paddingTop: 32, paddingBottom: 16 }}>
      <WaterHistoryScreen refreshing={refreshing} onRefresh={refresh} />
    </Screen>
  );
}
