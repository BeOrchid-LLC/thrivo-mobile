import { Stack } from "expo-router";
import { popOnlyScreenListeners, popOnlyScreenOptions } from "@/navigation/pop-animation";

/** Settings stack within the (app) tab — index + account deletion. */
export default function SettingsLayout() {
  return <Stack screenOptions={popOnlyScreenOptions} screenListeners={popOnlyScreenListeners} />;
}
