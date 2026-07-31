import { useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, CheckIcon, Text } from "@/components";
import { colors } from "@/theme";
import { addDays, localDay } from "@/utils";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { NoteBox } from "@/features/onboarding/components/NoteBox";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { useSubscription } from "@/features/subscription";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { MONTHLY_PRICE_DISPLAY, TRIAL_DAYS } from "@/config/pricing";
import type { OnboardingStepProps } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TRIAL_FEATURES = [
  "Food, water, calories, and weight history beyond 14 days",
  "Longer trend charts across progress metrics",
  "Full food log history for reviewing patterns",
  "Premium insights as they become available",
];

export default function StartFreeStep({
  mode = "initial",
  onNext,
  onDone,
  onBack,
  isSaving,
  variant,
}: OnboardingStepProps) {
  useOnboardingPrefill();
  const subscription = useSubscription();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();
  const { setIsOnboardingSkipped } = useSessionActions();
  const [error, setError] = useState<string | null>(null);
  const trialDays = subscription.data?.subscription?.trialDays ?? TRIAL_DAYS;
  const [y, m, d] = addDays(localDay(), trialDays).split("-").map(Number);
  const trialEndLong = `${d} ${MONTHS[m - 1]} ${y}`;
  const hasPremium = subscription.data?.subscription?.entitlement === "premium";
  const trialUsed = Boolean(subscription.data?.subscription?.trialUsed);

  const continueWithoutPreview = () => {
    const fields = { onboardingStep: 6 as const };
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    setIsOnboardingSkipped(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 6 });
  };

  const startTrial = async () => {
    setError(null);
    if (mode === "revisit" && (hasPremium || trialUsed)) {
      continueWithoutPreview();
      return;
    }
    try {
      await submit("start_free_trial", { onboardingStep: 6 });
      if (mode === "revisit") {
        await onNext?.({ onboardingStep: 6 });
      } else {
        router.push("/(onboarding)/notifications");
      }
    } catch {
      setError("We couldn't start your premium preview. Please try again.");
    }
  };

  return (
    <OnboardingStep
      step={6}
      title="Start your premium preview"
      subtitle={`Try longer history and trend access for ${trialDays} days. Paid plans are ${MONTHLY_PRICE_DISPLAY}/month when enabled.`}
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={hasPremium ? "Continue with premium" : "Start premium preview"}
            loading={isPending || isSaving}
            onPress={() => void startTrial()}
          />
          <Text variant="caption" color="muted" className="text-center font-regular">
            Preview access runs through {trialEndLong}. You can manage access in Settings.
          </Text>
          <Button
            label={mode === "revisit" ? "Continue without premium" : "Skip for now"}
            variant="ghost"
            disabled={isPending || isSaving}
            onPress={continueWithoutPreview}
          />
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="overflow-hidden rounded-[20px] border-[1.333px] border-primary">
        <LinearGradient
          colors={[colors.dark, colors.gradientMid, colors.primaryBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 24 }}
        >
          <View className="flex-row items-end">
            <Text variant="hero" color="light" className="font-bold">
              {MONTHLY_PRICE_DISPLAY}
            </Text>
            <Text variant="body" color="light70" className="mb-[3px] ml-xs">
              / month
            </Text>
          </View>
          <Text variant="body" color="accent" className="mt-xs font-bold">
            {trialDays}-day premium preview
          </Text>
          <View className="mt-md gap-sm">
            <PriceRow label="Trial ends" value={trialEndLong} />
            <PriceRow label="Plan price" value={`${MONTHLY_PRICE_DISPLAY}/month`} />
            <PriceRow label="Preview cost" value="Pay nothing" accent />
          </View>
        </LinearGradient>
      </View>
      <NoteBox title="How to manage access">Settings → Subscription</NoteBox>
      <View className="gap-md">
        {TRIAL_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-sm">
            <View className="h-[22px] w-[22px] items-center justify-center rounded-pill bg-primaryBright/[0.08]">
              <CheckIcon size={12} color={colors.primary} />
            </View>
            <Text variant="body" color="dark" className="flex-1">
              {feature}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" color="muted" className="font-regular">
        No payment is collected in the app during this MVP preview.
      </Text>
    </OnboardingStep>
  );
}

function PriceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text variant="label" color="light70">
        {label}
      </Text>
      <Text variant="label" color={accent ? "accent" : "light"} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
