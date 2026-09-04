import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, PageHeader, Text } from "@/components";
import { useMe, useUpdateProfile } from "@/features/profile";
import {
  analytics,
  monitoring,
  requestNotificationPermission,
  scheduleDailyReminders,
  syncPushRegistration,
} from "@/lib";
import { colors, spacing } from "@/theme";
import { localTimezone } from "@/utils";
import {
  DEFAULT_REMINDER_TIMES,
  MAX_REMINDER_TIMES,
  ReminderTimesPicker,
} from "../components/ReminderTimesPicker";
import { useSettings } from "../hooks/useSettings";

/** Page padding from the frame (393pt wide) — the scale has no 20. */
const PAGE_PADDING_X = 20;
/** Air above and below the pinned actions, on top of the safe-area inset. */
const FOOTER_PADDING_Y = 16;
/** The frame's gap between the two actions. */
const FOOTER_GAP = 24;

/** Stored times may arrive as "HH:mm:ss"; the picker works in "HH:mm". */
function toHhmm(times: string[] | null | undefined): string[] | null {
  if (!times?.length) return null;
  return times.slice(0, MAX_REMINDER_TIMES).map((time) => time.slice(0, 5));
}

/**
 * Fills the schedule out to three slots so raising the count never lands on an
 * undefined time — the extra slots keep the defaults until they're shown.
 */
function seedTimes(saved: string[] | null): string[] {
  if (!saved) return DEFAULT_REMINDER_TIMES;
  return DEFAULT_REMINDER_TIMES.map((fallback, index) => saved[index] ?? fallback);
}

/**
 * Settings → daily food log reminder (Figma "Settings - Reminder Setup").
 *
 * Writes `user.notifyTimes` — the field `POST /push/register` carries, and the
 * one the onboarding step writes too (docs/reminder-scheduling-design.md). It
 * lives in the `(app)` stack rather than under `(tabs)`, so it covers the tab
 * bar the way the other pushed screens do.
 */
export function FoodLogReminderScreen() {
  const profile = useMe();
  const settings = useSettings();
  const updateProfile = useUpdateProfile();

  // Seeded once, from whichever source has a schedule: the profile's times, or
  // the single settings time as a starting point when it has none.
  const settingsTime = settings.data?.dailyFoodLogReminderTime?.slice(0, 5);
  const saved = toHhmm(profile.data?.notifyTimes) ?? (settingsTime ? [settingsTime] : null);
  const [times, setTimes] = useState(() => seedTimes(saved));
  const [count, setCount] = useState(() =>
    Math.min(Math.max(saved?.length ?? 2, 1), MAX_REMINDER_TIMES)
  );
  const [seededFrom, setSeededFrom] = useState(saved);
  const [error, setError] = useState<string | null>(null);

  // The profile lands after the first render on a cold open; re-seed once it
  // does, but never over a choice the user has already made here.
  if (saved && saved.join() !== seededFrom?.join()) {
    setSeededFrom(saved);
    setTimes(seedTimes(saved));
    setCount(Math.min(Math.max(saved.length, 1), MAX_REMINDER_TIMES));
  }

  const selectedTimes = times.slice(0, count);

  const save = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({
        notifyTimes: selectedTimes,
        timezone: profile.data?.timezone ?? localTimezone(),
      });
    } catch {
      setError("We couldn't save your reminder times. Please try again.");
      return;
    }
    // Same tagging as the onboarding step, so the funnel can tell the two
    // surfaces that write `notifyTimes` apart.
    analytics.track("thrivo.reminder_set", {
      reminder: "notifyTimes",
      count: selectedTimes.length,
    });
    try {
      // The device-local schedule is what actually delivers a reminder today,
      // so it is armed here and must not be lost to a backend failure. This
      // screen is an explicit "Enable notifications", so it is allowed to
      // prompt; denial degrades to no reminders rather than an error.
      const { granted } = await requestNotificationPermission();
      if (granted) await scheduleDailyReminders(selectedTimes);

      // Best effort, and deliberately not awaited — see the same call in the
      // onboarding step. On the iOS Simulator this always fails (no APNs), and
      // it used to be the only thing the user was told about.
      void syncPushRegistration(selectedTimes).catch((error: unknown) => {
        monitoring.captureException(error, { seam: "push-registration" });
      });
    } catch (error) {
      monitoring.captureException(error, { seam: "reminder-scheduling" });
      setError("Your reminder times were saved, but we couldn't switch reminders on. Try again.");
      return;
    }
    router.back();
  };

  return (
    // The same gradient pairing as the onboarding frames — this screen is the
    // post-onboarding twin of that step.
    <LinearGradient colors={[colors.light, colors.primarySoft]} style={{ flex: 1 }}>
      {/* `bottom` included on purpose: the actions are pinned to the page,
          so without the inset they sit on the home indicator. The strip it
          leaves below them is the tail of the same gradient the footer is
          painted in, so the two read as one surface. */}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right", "bottom"]}>
        <View
          style={{
            paddingHorizontal: PAGE_PADDING_X,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          }}
        >
          <PageHeader
            title="Daily food log reminder"
            subtitle="Pick 1–3 reminder times a day. We'll remind you to record what you've eaten."
            onBack={() => router.back()}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: PAGE_PADDING_X,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ReminderTimesPicker
            times={times}
            count={count}
            onCountChange={setCount}
            onTimeChange={(index, time) =>
              setTimes((previous) => previous.map((value, at) => (at === index ? time : value)))
            }
          />
        </ScrollView>

        {/* Pinned, like the onboarding frames: the gradient ends on this token,
            so the backdrop the content scrolls out from behind matches. */}
        <View
          style={{
            paddingHorizontal: PAGE_PADDING_X,
            paddingTop: FOOTER_PADDING_Y,
            paddingBottom: FOOTER_PADDING_Y,
            gap: FOOTER_GAP,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Button
            label="Enable notifications"
            loading={updateProfile.isPending}
            onPress={() => void save()}
          />
          <Button
            label="Skip for now"
            variant="ghost"
            disabled={updateProfile.isPending}
            onPress={() => router.back()}
          />
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
