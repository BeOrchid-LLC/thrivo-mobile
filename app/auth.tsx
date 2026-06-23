import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BrandSplash } from "@/components";
import { queryKeys } from "@/api";
import { setTokens, analytics } from "@/lib";
import { getMe } from "@/features/profile";
import { useAuthStatus, useSessionActions } from "@/stores";

/**
 * Handles `thrivo://auth?token=X&refresh=Y` deep links produced by the
 * Google OAuth redirect. Applies the tokens, fetches the user profile,
 * and routes to onboarding or dashboard. Root guard is excluded from
 * redirecting while this screen is active (see app/_layout.tsx).
 */
export default function AuthCallbackScreen() {
  const { token, refresh } = useLocalSearchParams<{ token?: string; refresh?: string }>();
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
      });
      analytics.identify(user.id);
      return user;
    },
    onSuccess: (user) => {
      router.replace(user.isOnboarded ? "/(app)/dashboard" : "/(onboarding)/name");
    },
    onError: () => {
      router.replace("/(auth)/sign-in");
    },
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!token || !refresh) {
      router.replace("/(auth)/sign-in");
      return;
    }
    if (!started.current) {
      started.current = true;
      apply.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return <BrandSplash />;
}
