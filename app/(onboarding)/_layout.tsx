import { Stack } from "expo-router";
import { popOnlyScreenListeners, popOnlyScreenOptions } from "@/navigation/pop-animation";

/** Authed-but-not-onboarded group (S3–S8). */
export default function OnboardingLayout() {
  return <Stack screenOptions={popOnlyScreenOptions} screenListeners={popOnlyScreenListeners} />;
}
