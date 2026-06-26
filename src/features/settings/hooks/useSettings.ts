import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { getSettings } from "../api/settings.api";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.me(),
    queryFn: getSettings,
    staleTime: 1000 * 60 * 5,
  });
}
