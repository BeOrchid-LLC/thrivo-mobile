import { useEffect, useMemo } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useMe } from "@/features/profile";
import { monitoring, scheduleDailyReminders } from "@/lib";
import { useIsAuthenticated } from "@/stores";

/** The profile may hold `HH:mm:ss`; the trigger only needs hours and minutes. */
function normalizeTimes(times: string[] | null | undefined): string[] | undefined {
  if (!times?.length) return undefined;
  return times.map((time) => time.slice(0, 5));
}

/**
 * Keeps the on-device daily reminders armed for the signed-in user.
 *
 * Every failure mode of local scheduling is silent — the symptom is "reminders
 * stopped" weeks later — so this re-arms on all four occasions the schedule can
 * go stale, and `scheduleDailyReminders` is idempotent so the overlap is free:
 *
 * - **Sign-in**, because a device that skipped onboarding never armed anything.
 * - **A change to `notifyTimes`**, from either the onboarding step or Settings.
 * - **Every foreground**, which covers the OS clearing schedules, an app
 *   upgrade, and permission granted in OS settings after the fact.
 * - **Timezone changes**, implicitly: a `DAILY` trigger fires on local
 *   wall-clock time, so travel and DST need no re-arm at all.
 *
 * Sign-out cancellation lives in `useLogout`, not here — an unmount is not a
 * sign-out, and cancelling on unmount would disarm reminders every time the
 * provider remounts.
 */
export function useReminderScheduling(): void {
  const isAuthenticated = useIsAuthenticated();
  const { data: me } = useMe();
  // Keyed on the joined string, not the array: a refetch of `me` returning
  // identical times still hands back a fresh array, and depending on identity
  // would re-arm on every refetch.
  const notifyTimesKey = normalizeTimes(me?.notifyTimes)?.join(",");
  const notifyTimes = useMemo(
    () => (notifyTimesKey ? notifyTimesKey.split(",") : undefined),
    [notifyTimesKey]
  );

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const arm = () => {
      void scheduleDailyReminders(notifyTimes).catch((error: unknown) => {
        monitoring.captureException(error, { seam: "reminder-scheduling" });
      });
    };

    arm();

    const appState = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") arm();
    });

    return () => appState.remove();
  }, [isAuthenticated, notifyTimes]);
}
