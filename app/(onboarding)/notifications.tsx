import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Card, Input, Text } from "@/components";
import { registerForPushNotifications } from "@/lib";
import { type OnboardingDraft, useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function NotificationsStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [notifyAt, setNotifyAt] = useState(draft.notifyAt?.slice(0, 5) ?? "08:00");
  const [isRegistering, setIsRegistering] = useState(false);

  const valid = TIME_PATTERN.test(notifyAt);
  const busy = isPending || isRegistering;

  const fields = (): Partial<OnboardingDraft> => ({
    notifyAt: valid ? notifyAt : undefined,
    timezone: localTimezone(),
    onboardingStep: 7,
  });

  const finish = async (enableNotifications: boolean) => {
    const nextFields = fields();
    setFields(nextFields);
    setIsRegistering(enableNotifications);
    try {
      if (enableNotifications && nextFields.notifyAt) {
        await registerForPushNotifications(nextFields.notifyAt);
      }
      await submit("complete", {
        silent: true,
        onboardingStep: 7,
        fields: nextFields,
      });
    } finally {
      setIsRegistering(false);
      router.replace("/(app)/dashboard");
    }
  };

  const skip = async () => {
    const nextFields = fields();
    setFields(nextFields);
    await submit("skip", { silent: true, onboardingStep: 7, fields: nextFields });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={7}
      title="Set a daily nudge"
      subtitle="A gentle reminder helps you log before the day gets away from you."
      footer={
        <>
          <Button
            label="Enable daily nudge"
            loading={busy}
            disabled={!valid}
            onPress={() => finish(true)}
          />
          <Button label="Skip for now" variant="ghost" disabled={busy} onPress={skip} />
        </>
      }
    >
      <Card className="items-center gap-sm">
        <View className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-primary">
          <Text className="text-[24px] font-bold leading-[28px] text-white">✓</Text>
        </View>
        <Text variant="heading3" color="dark">
          You're ready to start logging
        </Text>
        <Text variant="body" color="muted">
          Thrivo will open to your empty dashboard so your first action is simple.
        </Text>
      </Card>

      <Input
        label="Reminder time"
        placeholder="08:00"
        keyboardType="numbers-and-punctuation"
        value={notifyAt}
        onChangeText={setNotifyAt}
        error={valid ? undefined : "Use HH:mm, for example 08:00"}
      />
    </OnboardingStep>
  );
}
