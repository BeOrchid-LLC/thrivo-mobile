import { create } from "zustand";
import type { AccountStatus } from "@/contracts";

/**
 * Client-only auth/session state (MOBILE_ARCHITECTURE §4.2). Holds the auth
 * status, an in-memory mirror of the token (source of truth is expo-secure-store),
 * and lightweight session facts (`userId`, `accountStatus`) used by the
 * navigation guard. The full user profile is server data and lives in TanStack
 * Query — it is never duplicated here.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "restore_error";

interface SessionState {
  status: AuthStatus;
  token: string | null;
  userId: string | null;
  accountStatus: AccountStatus | null;
  actions: {
    /** Set after a successful auth/session restore. */
    setSession: (input: { token: string; userId: string; accountStatus: AccountStatus }) => void;
    /** Update just the lifecycle status (e.g. after onboarding activation). */
    setAccountStatus: (accountStatus: AccountStatus) => void;
    setStatus: (status: AuthStatus) => void;
    /** Clear on logout / 401. */
    clearSession: () => void;
  };
}

const initialState = {
  status: "loading" as AuthStatus,
  token: null,
  userId: null,
  accountStatus: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  actions: {
    setSession: ({ token, userId, accountStatus }) =>
      set({ status: "authenticated", token, userId, accountStatus }),
    setAccountStatus: (accountStatus) => set({ accountStatus }),
    setStatus: (status) => set({ status }),
    clearSession: () =>
      set({ status: "unauthenticated", token: null, userId: null, accountStatus: null }),
  },
}));

// Selector hooks — components subscribe to the narrowest slice they need.
export const useAuthStatus = () => useSessionStore((s) => s.status);
export const useIsAuthenticated = () => useSessionStore((s) => s.status === "authenticated");
export const useAccountStatus = () => useSessionStore((s) => s.accountStatus);
export const useIsOnboarded = () =>
  useSessionStore((s) => s.accountStatus !== null && s.accountStatus !== "dormant");
export const useSessionToken = () => useSessionStore((s) => s.token);
export const useSessionActions = () => useSessionStore((s) => s.actions);
