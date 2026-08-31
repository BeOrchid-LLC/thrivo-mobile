/**
 * Injection seam between the API client and the auth/session layer, so the
 * client (network only) never imports stores or device storage directly.
 *
 * - Phase 4 wires `setTokenGetter` to read the token from expo-secure-store.
 * - Phase 6 wires `setUnauthenticatedHandler` to clear the session + redirect.
 *
 * Until wired, the defaults make the client behave as a logged-out client.
 */

type TokenGetter = () => Promise<string | null> | string | null;
/** Returns a fresh access token (after rotating refresh), or null if it can't. */
type TokenRefresher = () => Promise<string | null>;

/**
 * How long an authed call waits for the seam to be wired before giving up.
 *
 * `ClerkTokenBridge` registers the getter from an effect, which lands a tick or
 * two after the persisted query cache rehydrates and starts refetching. Any
 * request that went out in that window carried no `Authorization` header, took
 * a 401, and rendered as a failed section — a dashboard with every card blank.
 * Waiting closes the race; the bound keeps a genuinely signed-out call from
 * hanging on a promise that will never resolve.
 */
const REGISTRATION_TIMEOUT_MS = 3000;

/** Null until wired — distinct from "wired, and it returned no token". */
let tokenGetter: TokenGetter | null = null;
let unauthenticatedHandler: () => void = () => {};
let tokenRefresher: TokenRefresher | null = null;

let announceRegistered: (() => void) | null = null;
const registered = new Promise<void>((resolve) => {
  announceRegistered = resolve;
});

export function setTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
  announceRegistered?.();
}

/** Resolves when the getter is registered, or when the wait budget runs out. */
function awaitRegistration(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, REGISTRATION_TIMEOUT_MS);
    void registered.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function setUnauthenticatedHandler(handler: () => void): void {
  unauthenticatedHandler = handler;
}

export function setTokenRefresher(refresher: TokenRefresher | null): void {
  tokenRefresher = refresher;
}

export async function getAuthToken(): Promise<string | null> {
  if (!tokenGetter) await awaitRegistration();
  return tokenGetter ? tokenGetter() : null;
}

/** Try to refresh the access token on a 401; null when unavailable/failed. */
export async function refreshAuthToken(): Promise<string | null> {
  return tokenRefresher ? tokenRefresher() : null;
}

/** Invoked by the client on a 401 so the app can clear session and re-route. */
export function handleUnauthenticated(): void {
  unauthenticatedHandler();
}
