import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

export type AppDeepLinkTarget =
  | "/(app)/(tabs)/dashboard"
  | "/(app)/(tabs)/log"
  | "/(app)/(tabs)/metrics"
  | "/(app)/subscription";

const STORAGE_KEY = "thrivo.navigation.pendingDeepLink";
const TTL_MS = 15 * 60 * 1000;

const routes: Record<string, AppDeepLinkTarget> = {
  dashboard: "/(app)/(tabs)/dashboard",
  log: "/(app)/(tabs)/log",
  metrics: "/(app)/(tabs)/metrics",
  // The public link keeps its "settings/subscription" path; the screen it
  // opens moved out of the tab group, so only the target changes.
  "settings/subscription": "/(app)/subscription",
};

export function parseAppDeepLink(url: string): AppDeepLinkTarget | null {
  const parsed = Linking.parse(url);
  const isCustomScheme = parsed.scheme === "thrivo";
  const isTrustedUniversalLink =
    parsed.scheme === "https" && parsed.hostname?.toLowerCase() === "thrivo.fit";
  if (!isCustomScheme && !isTrustedUniversalLink) return null;
  const customSchemeHost = isCustomScheme ? parsed.hostname : null;
  const path = [customSchemeHost, parsed.path]
    .filter(Boolean)
    .join("/")
    .replace(/^\/+|\/+$/g, "");
  return routes[path] ?? null;
}

export async function savePendingDeepLink(target: AppDeepLinkTarget): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({ target, expiresAt: Date.now() + TTL_MS })
  );
}

export async function consumePendingDeepLink(): Promise<AppDeepLinkTarget | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  await SecureStore.deleteItemAsync(STORAGE_KEY);
  try {
    const value = JSON.parse(raw) as { target?: string; expiresAt?: number };
    if (!value.expiresAt || value.expiresAt < Date.now()) return null;
    return value.target && Object.values(routes).includes(value.target as AppDeepLinkTarget)
      ? (value.target as AppDeepLinkTarget)
      : null;
  } catch {
    return null;
  }
}
