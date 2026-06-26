import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { getSubscription } from "../api/subscription.api";

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription.me(),
    queryFn: getSubscription,
    staleTime: 1000 * 60 * 5,
  });
}
