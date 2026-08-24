import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { popOnlyScreenListeners, popOnlyScreenOptions } from "@/navigation/pop-animation";
import { BrandSplash } from "@/components";

/** Unauthenticated group. Login is mandatory before any app access (ADR-0006). */
export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  if (!isLoaded) return <BrandSplash />;
  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={popOnlyScreenOptions} screenListeners={popOnlyScreenListeners} />;
}
