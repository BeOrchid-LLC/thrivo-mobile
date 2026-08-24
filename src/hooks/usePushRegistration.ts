import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useMe } from "@/features/profile";
import { addPushTokenChangeListener, monitoring, syncPushRegistration } from "@/lib";
import { useIsAuthenticated } from "@/stores";

/** The contract carries `HH:mm`; the profile may hold `HH:mm:ss`. */
function normalizeTimes(times: string[] | null | undefined): string[] | undefined {
  if (!times?.length) return undefined;
  return times.map((time) => time.slice(0, 5));
}

/**
 * Keeps the backend's push token current for the signed-in user.
 *
 * The token was registered exactly once, inside the onboarding notifications
 * step. That leaves three ways for reminders to stop arriving, all silent:
 *
 * - **The token rotates.** Reinstall, restore from backup, or an OS-level change
 *   issues a new Expo token; the backend keeps pushing to the old one.
 * - **Onboarding was skipped.** No token was ever sent.
 * - **Permission was granted later**, in iOS Settings rather than in the app.
 *
 * Runs on sign-in, on every foreground, and on rotation. It never prompts — it
 * only registers when permission is already granted, so it cannot ambush someone
 * who declined, and iOS shows the system prompt only once regardless.
 */
export function usePushRegistration(): void {
  const isAuthenticated = useIsAuthenticated();
  const { data: me } = useMe();
  // Re-send the schedule alongside the token. `notifyTimes` is optional in the
  // payload, so omitting it risks a backend reading absence as "clear them" —
  // which would silently wipe the user's reminders on every foreground.
  const notifyTimes = normalizeTimes(me?.notifyTimes);
  // Avoids re-POSTing an unchanged token on every foreground.
  const lastRegistered = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Next user on this device must register their own token.
      lastRegistered.current = null;
      return undefined;
    }

    let active = true;

    const sync = () => {
      void syncPushRegistration(notifyTimes)
        .then((token) => {
          if (!active || !token) return;
          lastRegistered.current = token;
        })
        .catch((error: unknown) => {
          // A failed registration is not worth surfacing — the user did nothing
          // wrong and the next foreground retries — but it must not be silent
          // to us, since the symptom is "reminders stopped" months later.
          monitoring.captureException(error, { seam: "push-registration" });
        });
    };

    sync();

    const appState = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") sync();
    });
    const tokenRotation = addPushTokenChangeListener(sync);

    return () => {
      active = false;
      appState.remove();
      tokenRotation();
    };
  }, [isAuthenticated, notifyTimes]);
}
