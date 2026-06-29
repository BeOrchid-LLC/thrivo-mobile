import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { CreateCheckinPayload } from "@/contracts";
import { createCheckin, getCheckins } from "../api/checkin.api";

export function useCheckins() {
  return useQuery({
    queryKey: queryKeys.checkins.list(),
    queryFn: getCheckins,
    select: (data) => data.checkins,
  });
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCheckinPayload) => createCheckin(payload),
    onSuccess: () => {
      // A check-in feeds both its own history and the streak surfaced on the dashboard.
      void queryClient.invalidateQueries({ queryKey: queryKeys.checkins.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.streak() });
    },
  });
}
