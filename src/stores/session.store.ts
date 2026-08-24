import { create } from "zustand";
import type { AccountStatus } from "@/contracts";

/**
 * Client-only auth/session state (MOBILE_ARCHITECTURE §4.2). Holds the auth
 * status and lightweight session facts (`userId`, `accountStatus`, `isOnboarded`,
 * `isOnboardingSkipped`) used by the navigation guard. The auth token is managed
 * by Clerk (@clerk/expo). The full user profile is server data in TanStack Query.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "restore_error";

interface SessionState {
  status: AuthStatus;
  userId: string | null;
  accountStatus: AccountStatus | null;
  isOnboarded: boolean;
  isOnboardingSkipped: boolean;
  actions: {
    /** Set after Clerk confirms sign-in and GET /users/me resolves. */
    setSession: (input: {
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
    /** Clear on sign-out / 401. */
    clearSession: () => void;
  };
}

const initialState = {
  status: "loading" as AuthStatus,
  userId: null,
  accountStatus: null,
  isOnboarded: false,
  isOnboardingSkipped: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  actions: {
    setSession: ({ userId, accountStatus, isOnboarded, isOnboardingSkipped }) =>
      set({
        status: "authenticated",
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
export const useUserId = () => useSessionStore((s) => s.userId);
export const useAccountStatus = () => useSessionStore((s) => s.accountStatus);
export const useIsOnboarded = () => useSessionStore((s) => s.isOnboarded);
export const useIsOnboardingSkipped = () => useSessionStore((s) => s.isOnboardingSkipped);
export const useSessionActions = () => useSessionStore((s) => s.actions);
