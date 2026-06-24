import { create } from "zustand";
import type { AccountStatus } from "@/contracts";

/**
 * Client-only auth/session state (MOBILE_ARCHITECTURE §4.2). Holds the auth
 * status, an in-memory mirror of the token (source of truth is expo-secure-store),
 * and lightweight session facts (`userId`, `accountStatus`, `isOnboarded`,
 * `isOnboardingSkipped`) used by the navigation guard. The full user profile is
 * server data and lives in TanStack Query — it is never duplicated here.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "restore_error";

interface SessionState {
  status: AuthStatus;
  token: string | null;
  userId: string | null;
  accountStatus: AccountStatus | null;
  isOnboarded: boolean;
  isOnboardingSkipped: boolean;
  actions: {
    /** Set after a successful auth/session restore. */
    setSession: (input: {
      token: string;
      userId: string;
      accountStatus: AccountStatus;
      isOnboarded: boolean;
      isOnboardingSkipped: boolean;
    }) => void;
    /** Update lifecycle/onboarding flags after profile changes. */
    setProfileStatus: (input: {
      accountStatus: AccountStatus;
      isOnboarded: boolean;
      isOnboardingSkipped: boolean;
    }) => void;
    /** Optimistically mark the user as onboarded (used by the complete path). */
    setIsOnboarded: (value: boolean) => void;
    /** Optimistically mark onboarding as skipped (used by every skip path). */
    setIsOnboardingSkipped: (value: boolean) => void;
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
  isOnboarded: false,
  isOnboardingSkipped: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  actions: {
    setSession: ({ token, userId, accountStatus, isOnboarded, isOnboardingSkipped }) =>
      set({
        status: "authenticated",
        token,
        userId,
        accountStatus,
        isOnboarded,
        isOnboardingSkipped,
      }),
    setProfileStatus: ({ accountStatus, isOnboarded, isOnboardingSkipped }) =>
      set({ accountStatus, isOnboarded, isOnboardingSkipped }),
    setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
    setIsOnboardingSkipped: (isOnboardingSkipped) => set({ isOnboardingSkipped }),
    setStatus: (status) => set({ status }),
    clearSession: () =>
      set({
        status: "unauthenticated",
        token: null,
        userId: null,
        accountStatus: null,
        isOnboarded: false,
        isOnboardingSkipped: false,
      }),
  },
}));

// Selector hooks — components subscribe to the narrowest slice they need.
export const useAuthStatus = () => useSessionStore((s) => s.status);
export const useIsAuthenticated = () => useSessionStore((s) => s.status === "authenticated");
export const useAccountStatus = () => useSessionStore((s) => s.accountStatus);
export const useIsOnboarded = () => useSessionStore((s) => s.isOnboarded);
export const useIsOnboardingSkipped = () => useSessionStore((s) => s.isOnboardingSkipped);
export const useSessionToken = () => useSessionStore((s) => s.token);
export const useSessionActions = () => useSessionStore((s) => s.actions);
