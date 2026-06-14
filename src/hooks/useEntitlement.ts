import { useQuery } from "@tanstack/react-query";
import { callApi, queryKeys } from "@/api";
import { useIsAuthenticated } from "@/stores";

/**
 * Exposes the user's entitlement for in-screen premium gating (MOBILE_ARCHITECTURE
 * §5). Free vs premium is a content gate *within* the (app) group, not a separate
 * route — screens use `isPremium` to blur/unlock premium sections.
 */
export function useEntitlement(): { isPremium: boolean; isLoading: boolean } {
  const isAuthenticated = useIsAuthenticated();

  const query = useQuery({
    queryKey: queryKeys.subscription.me(),
    queryFn: () => callApi("GET_SUBSCRIPTION"),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isPremium: query.data?.subscription.entitlement === "premium",
    isLoading: query.isLoading,
  };
}
