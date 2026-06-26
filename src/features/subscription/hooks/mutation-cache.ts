import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { SubscriptionResponse } from "@/contracts";

export function syncSubscriptionCaches(queryClient: QueryClient, response: SubscriptionResponse) {
  queryClient.setQueryData(queryKeys.subscription.me(), response);
  void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
}
