import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import type { UpdateUserSettingsPayload, UserSettings } from "@/contracts";
import { updateSettings } from "../api/settings.api";

/**
 * Settings mutations apply **optimistically**: the cache is patched on mutate so
 * every toggle/time flips instantly (no shared `isPending` lag across controls),
 * rolls back to the prior snapshot on error, and reconciles with the server
 * response on success. This lets the UI drop the "disable all switches while
 * saving" behavior — each control reflects its own value immediately.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const key = queryKeys.settings.me();

  return useMutation({
    mutationFn: (payload: UpdateUserSettingsPayload) => updateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserSettings>(key);
      if (previous) {
        queryClient.setQueryData<UserSettings>(key, { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(key, settings);
    },
  });
}
