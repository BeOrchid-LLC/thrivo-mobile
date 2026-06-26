import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { UpdateUserSettingsPayload } from "@/contracts";
import { updateSettings } from "../api/settings.api";

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserSettingsPayload) => updateSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings.me(), settings);
    },
  });
}
