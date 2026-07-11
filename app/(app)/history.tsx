import { useState } from "react";
import { Screen } from "@/components";
import { FoodHistoryScreen } from "@/features/dashboard";
import { queryClient, queryKeys } from "@/api";

export default function History() {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    void queryClient
      .invalidateQueries({ queryKey: queryKeys.foods.logHistory() })
      .finally(() => setRefreshing(false));
  };

  return (
    <Screen edges={["top", "left", "right"]} style={{ paddingTop: 32, paddingBottom: 16 }}>
      <FoodHistoryScreen refreshing={refreshing} onRefresh={refresh} />
    </Screen>
  );
}
