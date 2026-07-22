import { useEffect } from "react";
import { router } from "expo-router";
import { BrandSplash } from "@/components";

/**
 * Legacy OAuth callback route. The old server-side Google OAuth flow redirected
 * to `thrivo://auth?token=...`. That flow is replaced by Clerk's client-side
 * OAuth — this route is never visited during normal operation and can be removed
 * after the next app release cycle.
 */
export default function AuthCallbackScreen() {
  useEffect(() => {
    router.replace("/(auth)/welcome");
  }, []);

  return <BrandSplash />;
}
