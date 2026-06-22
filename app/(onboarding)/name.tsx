import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, Input } from "@/components";
import { useMe } from "@/features/profile";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingDraft, useOnboardingDraftActions } from "@/stores";

export default function NameStep() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const { data: me } = useMe();
  const { submit, isPending } = useSubmitOnboarding();
  const [firstName, setFirstName] = useState(draft.firstName ?? me?.name ?? "");

  useEffect(() => {
    if (!draft.firstName && me?.name) {
      setFirstName(me.name);
      setFields({ firstName: me.name, onboardingStep: 1 });
    }
  }, [draft.firstName, me?.name, setFields]);

  const trimmed = firstName.trim();

  const next = () => {
    if (!trimmed) return;
    setFields({ firstName: trimmed, onboardingStep: 1 });
    router.push("/(onboarding)/goal");
  };

  const skip = async () => {
    if (trimmed) {
      setFields({ firstName: trimmed, onboardingStep: 1 });
    }
    await submit("skip", {
      silent: true,
      onboardingStep: 1,
      fields: trimmed ? { firstName: trimmed } : undefined,
    });
    router.replace("/(app)/dashboard");
  };

  return (
    <OnboardingStep
      step={1}
      title="What should we call you?"
      subtitle="We'll use this name throughout the app."
      footer={
        <>
          <Button label="Continue" disabled={!trimmed} onPress={next} />
          <Button label="Skip for now" variant="ghost" loading={isPending} onPress={skip} />
        </>
      }
    >
      <Input
        label="First name"
        uppercaseLabel
        placeholder="Alex"
        autoCapitalize="words"
        autoComplete="given-name"
        value={firstName}
        onChangeText={setFirstName}
        returnKeyType="next"
        onSubmitEditing={next}
      />
    </OnboardingStep>
  );
}
