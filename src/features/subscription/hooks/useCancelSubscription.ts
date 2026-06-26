import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CancelSubscriptionPayload } from "@/contracts";
import { cancelSubscription } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CancelSubscriptionPayload = {}) => cancelSubscription(payload),
    onSuccess: (response) => syncSubscriptionCaches(queryClient, response),
  });
}
