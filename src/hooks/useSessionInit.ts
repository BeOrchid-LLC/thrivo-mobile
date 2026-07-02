import { useEffect } from "react";
import { callApi, isApiError } from "@/api";
import { getToken, clearToken } from "@/lib";
import { useAuthStatus, useSessionActions } from "@/stores";

const TOKEN_RESTORE_TIMEOUT_MS = 8000;
const SESSION_RESTORE_TIMEOUT_MS = 10000;

function bootLog(message: string): void {
  if (__DEV__) console.info(`[boot] ${message}`);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onTimeout?: () => void
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`${label} timed out`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

/**
 * Hydrates the session store from secure-store at app start. A token is trusted
 * only after `GET /auth/session` succeeds; a 401 clears local auth, while transient
 * network failures keep the token for an explicit retry.
 */
export function useSessionInit(): void {
  const status = useAuthStatus();
  const actions = useSessionActions();

  useEffect(() => {
    let active = true;

    if (status !== "loading") return undefined;

    void (async () => {
      try {
        bootLog("session restore started");
        const token = await withTimeout(getToken(), TOKEN_RESTORE_TIMEOUT_MS, "token restore");
        if (!active) return;

        if (!token) {
          bootLog("session restore finished: no token");
          actions.setStatus("unauthenticated");
          return;
        }

        const controller = new AbortController();
        bootLog("session validation started");
        const { session } = await withTimeout(
          callApi("GET_SESSION", { signal: controller.signal }),
          SESSION_RESTORE_TIMEOUT_MS,
          "session validation",
          () => controller.abort()
        );
        if (!active) return;
        bootLog("session restore finished: authenticated");
        actions.setSession({
          token,
          userId: session.userId,
          accountStatus: session.accountStatus,
          isOnboarded: session.isOnboarded,
          isOnboardingSkipped: session.isOnboardingSkipped,
        });
      } catch (error) {
        if (!active) return;
        if (isApiError(error) && error.isAuthError) {
          await withTimeout(clearToken(), TOKEN_RESTORE_TIMEOUT_MS, "token clear").catch(() => {
            bootLog("token clear timed out");
          });
          if (!active) return;
          actions.clearSession();
          bootLog("session restore finished: auth error");
          return;
        }
        bootLog("session restore failed");
        actions.setStatus("restore_error");
      }
    })();

    return () => {
      active = false;
    };
  }, [actions, status]);
}
