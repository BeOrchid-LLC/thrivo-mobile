import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StartTrialPayload } from "@/contracts";
import { startTrial } from "../api/subscription.api";
import { syncSubscriptionCaches } from "./mutation-cache";

export function useStartTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartTrialPayload) => startTrial(payload),
    onSuccess: (response) => syncSubscriptionCaches(queryClient, response),
  });
}
