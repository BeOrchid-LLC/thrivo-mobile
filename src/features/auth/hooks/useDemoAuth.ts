import { useCallback, useState } from "react";
import { setToken, analytics } from "@/lib";
import { useSessionActions } from "@/stores";

/** Cosmetic label for which demo entry point was tapped. */
export type DemoAuthProvider = "magic-link" | "google" | "apple";

/**
 * DEMO ONLY — fabricates an authenticated session with **no backend call** so the
 * app is walkable end-to-end. It mirrors the real `applySession` shape (token →
 * secure-store as the source of truth, facts → session store) so the navigation
 * guard reacts exactly as it will in production. New demo users are created
 * un-onboarded, so the guard routes them into `(onboarding)`.
 *
 * Delete this hook (and its callers) when the real auth flows in `useAuth` land.
 */
export function useDemoAuth() {
  const { setSession } = useSessionActions();
  const [isPending, setIsPending] = useState(false);

  const signIn = useCallback(
    async (_provider: DemoAuthProvider = "magic-link") => {
      setIsPending(true);
      // A throwaway token; secure-store remains the source of truth so a reload
      // keeps the demo session (useSessionInit re-hydrates from it).
      const token = `demo.${Date.now()}`;
      await setToken(token);
      setSession({ token, userId: "demo-user", accountStatus: "dormant" });
      analytics.identify("demo-user");
      setIsPending(false);
    },
    [setSession]
  );

  return { signIn, isPending };
}
