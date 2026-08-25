import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useMe, useUpdateProfile } from "@/features/profile";
import { monitoring } from "@/lib";
import { useIsAuthenticated } from "@/stores";
import { localTimezone } from "@/utils";

/**
 * Keeps the profile's timezone matching the device.
 *
 * The backend schedules reminders in the user's local time, but the app only
 * ever set the timezone **once**, during onboarding. Anyone who then travelled,
 * moved, or simply changed their device setting kept the original value forever,
 * so an 8am reminder arrives at 8am in a city they no longer live in. Users who
 * skipped onboarding never sent one at all, leaving the backend to fall back to
 * a single global UTC time.
 *
 * Checked on sign-in and whenever the app returns to the foreground, because a
 * timezone changes while the app is backgrounded — landing from a flight, or
 * crossing a DST boundary overnight — and there is no event for it.
 *
 * Only fires when the value actually differs, so it costs nothing in the normal
 * case, and a failure is reported rather than retried: the next foreground is
 * along soon enough and a wrong timezone is not worth blocking the UI over.
 */
export function useTimezoneSync(): void {
  const isAuthenticated = useIsAuthenticated();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const storedTimezone = me?.timezone ?? null;
  // Avoids re-sending the same correction while a PATCH is already in flight or
  // the query cache has not caught up yet.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !me) return undefined;

    const sync = () => {
      const current = localTimezone();
      if (current === storedTimezone || current === lastSent.current) return;

      lastSent.current = current;
      updateProfile.mutate(
        { timezone: current },
        {
          onError: (error) => {
            // Allow a later foreground to try again.
            lastSent.current = null;
            monitoring.captureException(error, { seam: "timezone-sync", timezone: current });
          },
        }
      );
    };

    sync();

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") sync();
    });
    return () => subscription.remove();
    // `updateProfile` is a stable mutation object; re-subscribing on it would
    // tear down the listener on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, me, storedTimezone]);
}
