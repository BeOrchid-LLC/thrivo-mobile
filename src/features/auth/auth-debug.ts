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

export function logAuthError(screen: string, stage: string, error: unknown): void {
  if (__DEV__) console.error(`[auth:${screen}] ${stage} error: ${formatError(error)}`);
}
