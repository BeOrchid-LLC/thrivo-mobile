import { create } from "zustand";

/**
 * Client-only auth/session state (MOBILE_ARCHITECTURE §4.2). Holds the auth
 * status, an in-memory mirror of the token (source of truth is expo-secure-store),
 * and lightweight session facts (`userId`, `isOnboarded`) used by the navigation
 * guard. The full user profile is server data and lives in TanStack Query — it
 * is never duplicated here.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionState {
  status: AuthStatus;
  token: string | null;
  userId: string | null;
  isOnboarded: boolean;
  actions: {
    /** Set after a successful auth/session restore. */
    setSession: (input: { token: string; userId: string; isOnboarded: boolean }) => void;
    /** Update just the onboarding flag (e.g. after the final onboarding step). */
    setOnboarded: (isOnboarded: boolean) => void;
    setStatus: (status: AuthStatus) => void;
    /** Clear on logout / 401. */
    clearSession: () => void;
  };
}

const initialState = {
  status: "loading" as AuthStatus,
  token: null,
  userId: null,
  isOnboarded: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  actions: {
    setSession: ({ token, userId, isOnboarded }) =>
      set({ status: "authenticated", token, userId, isOnboarded }),
    setOnboarded: (isOnboarded) => set({ isOnboarded }),
    setStatus: (status) => set({ status }),
    clearSession: () =>
      set({ status: "unauthenticated", token: null, userId: null, isOnboarded: false }),
  },
}));

// Selector hooks — components subscribe to the narrowest slice they need.
export const useAuthStatus = () => useSessionStore((s) => s.status);
export const useIsAuthenticated = () => useSessionStore((s) => s.status === "authenticated");
export const useIsOnboarded = () => useSessionStore((s) => s.isOnboarded);
export const useSessionToken = () => useSessionStore((s) => s.token);
export const useSessionActions = () => useSessionStore((s) => s.actions);
