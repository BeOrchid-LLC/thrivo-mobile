import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { useIsAuthenticated } from "@/stores";
import { getMe } from "../api/profile.api";

export function useMe() {
  // Gated on the session store: this hook is reached from always-mounted roots
  // (useTimezoneSync in the root layout), and the persisted cache rehydrates it
  // as stale on cold start. Without the gate it refetches before Clerk's token
  // seam is wired — and while signed out — producing tokenless 401s.
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
    enabled: isAuthenticated,
  });
}
