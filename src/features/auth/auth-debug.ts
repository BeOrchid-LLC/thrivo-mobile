import { useEffect, useRef } from "react";
import type { AuthStatus } from "@/stores/session.store";

interface ClerkAuthState {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
}

function formatError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { longMessage?: unknown; message?: unknown };
    if (typeof candidate.longMessage === "string") return candidate.longMessage;
    if (typeof candidate.message === "string") return candidate.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function useAuthScreenDiagnostics(
  screen: string,
  status: AuthStatus,
  clerk: ClerkAuthState
): void {
  const previousStatus = useRef<AuthStatus | undefined>(undefined);

  useEffect(() => {
    const event = previousStatus.current === undefined ? "navigated" : "status changed";
    if (__DEV__)
      console.info(
        `[auth:${screen}] ${event}; store=${status} clerkLoaded=${clerk.isLoaded} clerkSignedIn=${clerk.isSignedIn}`
      );
    previousStatus.current = status;
  }, [clerk.isLoaded, clerk.isSignedIn, screen, status]);
}

/**
 * Deliberately `console.log`, not `console.error`. Every failed sign-in reaches
 * here — including the ordinary outcome of the user backing out of the Apple or
 * Google sheet — and in dev `console.error` turns that into a LogBox error
 * toast over the sign-in screen. The user already sees the inline message the
 * screen renders from the mutation error; this is only a dev breadcrumb.
 */
export function logAuthError(screen: string, stage: string, error: unknown): void {
  if (__DEV__) console.log(`[auth:${screen}] ${stage} error: ${formatError(error)}`);
}
