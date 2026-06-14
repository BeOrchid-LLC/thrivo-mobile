import { Stack } from "expo-router";

/** Unauthenticated group. Login is mandatory before any app access (ADR-0006). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
