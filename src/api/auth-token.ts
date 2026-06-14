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

let tokenGetter: TokenGetter = () => null;
let unauthenticatedHandler: () => void = () => {};

export function setTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

export function setUnauthenticatedHandler(handler: () => void): void {
  unauthenticatedHandler = handler;
}

export async function getAuthToken(): Promise<string | null> {
  return tokenGetter();
}

/** Invoked by the client on a 401 so the app can clear session and re-route. */
export function handleUnauthenticated(): void {
  unauthenticatedHandler();
}
