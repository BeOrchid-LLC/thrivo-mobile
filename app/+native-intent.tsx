import { parseAppDeepLink, type AppDeepLinkTarget } from "@/navigation/pending-deep-link";

/**
 * Paths whose screen has moved since the public link was published, keyed by
 * the path Expo Router receives. The link in a push payload or an email outlives
 * any reshuffle of `app/`, so a moved screen is a redirect here — never a
 * changed URL.
 */
const MOVED: Record<string, AppDeepLinkTarget> = {
  // The paywall left the tab group so it covers the tab bar; the URL did not.
  "/settings/subscription": "/(app)/subscription",
};

const normalize = (path: string): string =>
  `/${path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^\/+|\/+$/g, "")}`;

/**
 * Rewrites an incoming deep link before Expo Router matches it against the
 * filesystem. Without this a link to a screen that has since moved lands on
 * "Unmatched Route" — the router resolves URLs from the file tree, so it never
 * consults the app's own link table.
 *
 * Anything unrecognised passes through untouched, so this can only ever repair
 * a link, never swallow one.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // Full URLs carry the scheme's authority as their first segment
    // (`thrivo://settings/subscription`), so match on the normalised tail and
    // let `parseAppDeepLink` apply the scheme/host trust rules.
    const target = path.includes("://") ? parseAppDeepLink(path) : null;
    if (target) return target;
    return MOVED[normalize(path)] ?? path;
  } catch {
    return path;
  }
}
