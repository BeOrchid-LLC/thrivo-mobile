import { useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, CheckIcon, Text } from "@/components";
import { colors } from "@/theme";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { NoteBox } from "@/features/onboarding/components/NoteBox";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { productForPlan, useOfferings, usePurchaseSubscription } from "@/features/subscription";
import { useOnboardingDraftActions, useSessionActions } from "@/stores";
import { isBillingConfigured } from "@/lib";
import type { OnboardingStepProps } from "../types";

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
  const offerings = useOfferings();
  const purchase = usePurchaseSubscription();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();
  const { setIsOnboardingSkipped } = useSessionActions();
  const [error, setError] = useState<string | null>(null);
  const product = productForPlan(offerings.data, "monthly");

  const continueWithoutPreview = () => {
    const fields = { onboardingStep: 5 as const };
    setFields(fields);
    if (mode === "revisit") {
      void onNext?.(fields);
      return;
    }
    setIsOnboardingSkipped(true);
    router.replace("/(app)/(tabs)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 5 });
  };

  const startTrial = async () => {
    setError(null);
    try {
      if (!isBillingConfigured() || !product) throw new Error("Store offer unavailable");
      const result = await purchase.mutateAsync({
        plan: "monthly",
        packageId: product.id,
        isTrial: product.hasFreeTrial,
      });
      if (!result.confirmed) throw new Error("Activation delayed");
      await submit("skip", { silent: false, onboardingStep: 5 });
      if (mode === "revisit") await onNext?.({ onboardingStep: 5 });
      else router.push("/(onboarding)/notifications");
    } catch {
      setError("We couldn't start your premium preview. Please try again.");
    }
  };

  return (
    <OnboardingStep
      step={5}
      title="Start your premium preview"
      subtitle="Choose the store offer shown below. Pricing and any introductory period come from your app store."
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={product?.hasFreeTrial ? "Use store offer" : "Subscribe with store"}
            loading={isPending || isSaving || purchase.isPending || offerings.isLoading}
            onPress={() => void startTrial()}
          />
          <Text variant="caption" color="muted" className="text-center font-regular">
            {product?.hasFreeTrial ? `${product.trialLabel}. ` : ""}You can manage access in
            Settings.
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
      <View className="overflow-hidden rounded-panel border-[1.333px] border-primary">
        <LinearGradient
          colors={[colors.dark, colors.gradientMid, colors.primaryBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 24 }}
        >
          <View className="flex-row items-end">
            <Text variant="hero" color="light" className="font-bold">
              {product?.priceLabel ?? "Store price unavailable"}
            </Text>
            <Text variant="body" color="light70" className="mb-[3px] ml-xs">
              / {product?.periodLabel ?? "period"}
            </Text>
          </View>
          <Text variant="body" color="accent" className="mt-xs font-bold">
            {product?.trialLabel ?? "Standard store pricing"}
          </Text>
          <View className="mt-md gap-sm">
            <PriceRow label="Plan price" value={product?.priceLabel ?? "Unavailable"} />
            {product?.hasFreeTrial ? (
              <PriceRow label="Introductory offer" value={product.trialLabel ?? "Free"} accent />
            ) : null}
          </View>
        </LinearGradient>
      </View>
      <NoteBox title="How to manage access">Settings → Subscription</NoteBox>
      <View className="gap-md">
        {TRIAL_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-sm">
            <View className="h-iconSm w-iconSm items-center justify-center rounded-pill bg-primaryBright/[0.08]">
              <CheckIcon size={12} color={colors.primary} />
            </View>
            <Text variant="body" color="dark" className="flex-1">
              {feature}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" color="muted" className="font-regular">
        Billing and eligibility are determined by the store at checkout.
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
