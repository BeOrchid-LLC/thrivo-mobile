import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PurchaseSubscriptionPayload } from "@/contracts";
import { purchaseSubscription } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export function usePurchaseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PurchaseSubscriptionPayload) => purchaseSubscription(payload),
    onSuccess: (response) => syncSubscriptionCaches(queryClient, response),
  });
}
