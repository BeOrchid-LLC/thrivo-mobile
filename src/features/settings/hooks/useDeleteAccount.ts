import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/expo";
import { callApi } from "@/api";
import { monitoring } from "@/lib";
import { useBiometricUnlockActions, useSessionActions } from "@/stores";

/**
 * Permanently deletes the signed-in user's account.
 *
 * App Store review requires an in-app deletion path for any app with accounts,
 * and the acceptance bar is "all their data is gone; nothing orphaned" — which
 * spans two systems, our backend and Clerk.
 *
 * Order is deliberate:
 *
 * 1. `DELETE /users/me` — the backend owns the cascade and is expected to remove
 *    the Clerk identity too. If it fails, we stop and surface the error; a local
 *    sign-out here would look like success while the data survives.
 * 2. Clerk `user.delete()` — a best-effort backstop. If step 1 already removed
 *    the identity this throws (the session is gone), which is the expected
 *    outcome, not a failure. It only does real work if the backend left the
 *    identity behind, and that is exactly the orphan we must not ship.
 * 3. Sign out and clear every local trace.
 *
 * Steps 2 and 3 run only after step 1 succeeds.
 */
export function useDeleteAccount() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { clearSession } = useSessionActions();
  const { setBiometricUnlocked } = useBiometricUnlockActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Authoritative deletion. A throw here aborts the flow by design.
      await callApi("DELETE_ME");

      try {
        await user?.delete();
      } catch (error) {
        // Expected when the backend already removed the Clerk identity — the
        // token backing this call no longer resolves to a user. Recorded rather
        // than surfaced so a successful deletion never reads as a failure.
        monitoring.captureException(error, { seam: "clerk-user-delete-after-backend" });
      }

      try {
        await signOut();
      } catch (error) {
        // The account is already gone; a failed sign-out must not block the
        // local cleanup below or the user is stranded on a dead session.
        monitoring.captureException(error, { seam: "sign-out-after-delete" });
      }
    },
    onSuccess: () => {
      // Only clear local state once the server confirmed deletion.
      clearSession();
      setBiometricUnlocked(false);
      queryClient.clear();
      monitoring.setUser(null);
    },
  });
}
