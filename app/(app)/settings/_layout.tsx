import { Stack } from "expo-router";

/** Settings stack within the (app) tab — index + subscription management. */
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
