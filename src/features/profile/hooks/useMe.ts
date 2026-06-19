import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { getMe } from "../api/profile.api";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
  });
}
