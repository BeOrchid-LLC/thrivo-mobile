import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BrandSplash } from "@/components";
import { queryKeys } from "@/api";
import { setTokens, analytics } from "@/lib";
import { getMe } from "@/features/profile";
import { useAuthStatus, useSessionActions } from "@/stores";

type AuthCallbackParams = {
  token?: string;
  refresh?: string;
  error?: string;
};

function signInWithAuthError(router: ReturnType<typeof useRouter>, error?: string) {
  const authError =
    error === "expired" || error === "auth_failed" || error === "access_denied" ? error : "auth_failed";

  router.replace({
    pathname: "/(auth)/sign-in",
    params: { authError },
  });
}

/**
 * Handles `thrivo://auth?token=X&refresh=Y` deep links produced by Google OAuth.
 * Magic-link auth remains API-supported but is hidden in mobile while the UX is
 * revisited. Applies the tokens, fetches the user profile, and routes to
 * onboarding or dashboard. Root guard is excluded from redirecting while this
 * screen is active (see app/_layout.tsx).
 */
export default function AuthCallbackScreen() {
  const { token, refresh, error } = useLocalSearchParams<AuthCallbackParams>();
  const status = useAuthStatus();
  const { setSession } = useSessionActions();
  const queryClient = useQueryClient();
  const router = useRouter();
  const started = useRef(false);

  const apply = useMutation({
    mutationFn: async () => {
      await setTokens(token as string, refresh as string);
      const user = await getMe();
      queryClient.setQueryData(queryKeys.me(), user);
      setSession({
        token: token as string,
        userId: user.id,
        accountStatus: user.accountStatus,
        isOnboarded: user.isOnboarded,
        isOnboardingSkipped: user.isOnboardingSkipped,
      });
      analytics.identify(user.id);
      return user;
    },
    onSuccess: (user) => {
      router.replace(
        user.isOnboarded || user.isOnboardingSkipped ? "/(app)/dashboard" : "/(onboarding)/name"
      );
    },
    onError: () => {
      signInWithAuthError(router, "auth_failed");
    },
  });

  useEffect(() => {
    if (status === "loading") return;

    const providerError = typeof error === "string" ? error : undefined;
    if (providerError) {
      signInWithAuthError(router, providerError);
      return;
    }

    if (!token || !refresh) {
      signInWithAuthError(router, "auth_failed");
      return;
    }

    if (!started.current) {
      started.current = true;
      apply.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return <BrandSplash />;
};
