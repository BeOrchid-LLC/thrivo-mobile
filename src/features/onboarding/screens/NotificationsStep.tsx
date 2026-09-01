import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Text } from "@/components";
import { localTimezone } from "@/utils";
import {
  analytics,
  monitoring,
  requestNotificationPermission,
  scheduleDailyReminders,
  syncPushRegistration,
} from "@/lib";
import {
  DEFAULT_REMINDER_TIMES,
  MAX_REMINDER_TIMES,
  ReminderTimesPicker,
} from "@/features/settings";
import { type OnboardingDraft, useOnboardingDraftActions, useSessionActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { STEP_NUMBER, ONBOARDING_COMPLETE_STEP } from "../config";
import type { OnboardingStepProps } from "../types";

const STEP = STEP_NUMBER.notifications;

export default function NotificationsStep({
  mode = "initial",
  onNext,
  onDone,
  onBack,
  isSaving,
  variant,
}: OnboardingStepProps) {
  const { draft } = useOnboardingPrefill();
  const { setFields } = useOnboardingDraftActions();
  const { setIsOnboardingSkipped } = useSessionActions();
  const { submit, isPending } = useSubmitOnboarding();
  const seededTimes = draft.notifyTimes?.length ? draft.notifyTimes : DEFAULT_REMINDER_TIMES;
  const [times, setTimes] = useState(seededTimes);
  const [count, setCount] = useState(
    Math.min(Math.max(draft.notifyTimes?.length ?? 2, 1), MAX_REMINDER_TIMES)
  );
  const [error, setError] = useState<string | null>(null);
  const selectedTimes = times.slice(0, count);

  useEffect(() => {
    if (!draft.notifyTimes?.length) return;
    setTimes(draft.notifyTimes);
    setCount(Math.min(Math.max(draft.notifyTimes.length, 1), MAX_REMINDER_TIMES));
  }, [draft.notifyTimes]);

  const fieldsToSave = (): Partial<OnboardingDraft> => ({
    notifyTimes: selectedTimes,
    timezone: draft.timezone ?? localTimezone(),
    onboardingStep: STEP,
  });

  /**
   * Only a *saved* schedule counts — not a picker that was opened, and not a
   * save that failed.
   *
   * This screen is where most users first set their reminder times, and it
   * emitted nothing: the funnel only ever saw the Settings pickers, which write
   * a different field entirely (see docs/reminder-scheduling-design.md). The
   * `reminder` property separates the two surfaces, which is also the cheapest
   * way to find out which one users actually reach for.
   */
  const trackReminderSet = (times: string[] | undefined) => {
    analytics.track("thrivo.reminder_set", {
      reminder: "notifyTimes",
      count: times?.length ?? 0,
    });
  };

  const finish = async () => {
    setError(null);
    const next = fieldsToSave();
    setFields(next);
    try {
      if (mode === "revisit") {
        await onNext?.(next);
      } else {
        await submit("complete", { onboardingStep: ONBOARDING_COMPLETE_STEP, fields: next });
      }
      trackReminderSet(next.notifyTimes);
    } catch {
      setError("We couldn't save your reminder preferences. Please try again.");
      return;
    }
    try {
      // The device-local schedule is what actually delivers a reminder today,
      // so it is armed here and must not be lost to a backend failure. This is
      // the screen the user agreed to be asked on, so it is the one that
      // prompts; denial degrades to no reminders rather than an error, which is
      // the documented fallback.
      const { granted } = await requestNotificationPermission();
      if (granted) await scheduleDailyReminders(next.notifyTimes);

      // Best effort, and deliberately not awaited. The backend cannot push
      // until it has store credentials and a scheduler, and until then a
      // failure here is not something to ask the user to retry — their
      // reminders are already armed on the device. Registering anyway means the
      // token is in place the day the backend can use it.
      void syncPushRegistration(next.notifyTimes).catch((error: unknown) => {
        monitoring.captureException(error, { seam: "push-registration" });
      });
    } catch (error) {
      monitoring.captureException(error, { seam: "reminder-scheduling" });
      setError("Your reminder times were saved, but we couldn't switch reminders on. Try again.");
      return;
    }
    // The Settings revisit host owns its own navigation — only the onboarding
    // run hands off to the dashboard.
    if (mode === "revisit") return;
    router.replace("/(app)/(tabs)/dashboard");
  };

  const skip = () => {
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", {
      silent: true,
      onboardingStep: STEP,
      fields: { notifyTimes: undefined, timezone: undefined },
    });
  };

  return (
    <OnboardingStep
      step={STEP}
      title="Daily food log reminder"
      subtitle="Pick 1–3 reminder times a day. We'll check in — not spam you."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button label="Continue" loading={isPending || isSaving} onPress={() => void finish()} />
          <Button
            label="Skip for now"
            variant="ghost"
            disabled={isPending || isSaving}
            onPress={skip}
          />
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
        </>
      }
    >
      <ReminderTimesPicker
        times={times}
        count={count}
        onCountChange={setCount}
        onTimeChange={(index, value) =>
          setTimes((previous) => previous.map((time, at) => (at === index ? value : time)))
        }
      />
    </OnboardingStep>
  );
}
