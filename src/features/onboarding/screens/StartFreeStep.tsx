import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SealCheck } from "phosphor-react-native";
import { Button, Text } from "@/components";
import { colors, spacing } from "@/theme";
import { addDays, localDay } from "@/utils";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { TOTAL_ONBOARDING_STEPS } from "@/features/onboarding/config";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import {
  productForPlan,
  useOfferings,
  useOfferingsDiagnostics,
  usePurchaseSubscription,
} from "@/features/subscription";
import { useOnboardingDraftActions } from "@/stores";
import { isBillingConfigured, type SubscriptionProduct } from "@/lib";
import type { OnboardingStepProps } from "../types";

/** The frame's four value props, in its order. */
const TRIAL_FEATURES = [
  "Barcode food scanner - 5M+ items",
  "Daily calorie + macro dashboard",
  "Nudges + check-ins",
  "No ads, no fake coaches, no upsells",
];

/** Figma "Onboarding S6" metrics that the shared step chrome does not carry. */
const CARD_PADDING = spacing.xl;
const FEATURE_ICON = 22;
// The frame sets the panel, the feature list and the actions further apart than
// the earlier steps set their cards.
const CONTENT_GAP = 24;
// The dark half of the panel runs to just past the middle before it turns green.
const GRADIENT_STOPS = [0, 0.55, 1] as const;

const formatDay = (day: string, withYear: boolean): string => {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(year, month - 1, date));
};

/**
 * The dates the frame quotes, derived from the store's own trial length so the
 * paywall and the purchase sheet can never disagree. `null` whenever the offer
 * carries no trial (or the store has not answered yet).
 */
function trialDates(product: SubscriptionProduct | undefined) {
  if (!product?.hasFreeTrial || !product.trialDays) return null;
  const endsOn = addDays(localDay(), product.trialDays);
  return {
    days: product.trialDays,
    endsLong: formatDay(endsOn, true),
    endsShort: formatDay(endsOn, false),
  };
}

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
  useOfferingsDiagnostics(offerings);
  const purchase = usePurchaseSubscription();
  const { setFields } = useOnboardingDraftActions();
  const { submit, isPending } = useSubmitOnboarding();
  const [error, setError] = useState<string | null>(null);
  const product = productForPlan(offerings.data, "monthly");
  const trial = trialDates(product);
  const price = product?.priceLabel;

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
      setFields({ onboardingStep: 5 });
      await submit("skip", { silent: false, onboardingStep: 5 });
      if (mode === "revisit") await onNext?.({ onboardingStep: 5 });
      else router.push("/(onboarding)/notifications");
    } catch {
      setError("We couldn't start your free trial. Please try again.");
    }
  };

  return (
    <OnboardingStep
      // S6 is the frame's closing screen, so it titles the page "Almost done"
      // and draws the track full.
      step={TOTAL_ONBOARDING_STEPS}
      sectionTitle="Almost done"
      title="Start your free trial"
      subtitle="Everything Thrivo offers, unlocked. No hidden fees."
      contentGap={CONTENT_GAP}
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          <Button
            label={
              trial ? "Start free trial - $0 today" : price ? `Subscribe - ${price}` : "Subscribe"
            }
            loading={isPending || isSaving || purchase.isPending || offerings.isLoading}
            onPress={() => void startTrial()}
          />
          <Text variant="caption" color="muted" className="text-center font-regular">
            {trial
              ? `A card is required to start your trial. You won't be charged until ${trial.endsLong}. Cancel anytime before then.`
              : "A card is required. You can cancel anytime in Settings."}
          </Text>
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
          {mode === "revisit" ? (
            <Button
              label="Continue without premium"
              variant="ghost"
              disabled={isPending || isSaving}
              onPress={() => onDone?.()}
            />
          ) : null}
        </>
      }
    >
      <View className="overflow-hidden rounded-group border-[1.333px] border-primaryBright">
        <LinearGradient
          colors={[colors.dark, colors.gradientMid, colors.primaryBright]}
          locations={[...GRADIENT_STOPS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.35, y: 1 }}
          style={{ padding: CARD_PADDING }}
        >
          <View className="flex-row items-end">
            <Text variant="hero" color="light" className="font-bold">
              {price ?? "—"}
            </Text>
            <Text variant="body" color="light70" className="mb-[3px] ml-sm">
              / {product?.periodLabel ?? "month"}
            </Text>
          </View>
          <Text variant="body" color="accent" className="mt-sm font-bold">
            {trial
              ? `${trial.days}-day free trial`
              : product
                ? "Cancel anytime"
                : "Store offer unavailable"}
          </Text>
          <View className="mt-xl gap-md">
            {trial ? (
              <>
                <PriceRow label="Trial ends" value={trial.endsLong} />
                <PriceRow
                  label="First charge"
                  value={price ? `${price} on ${trial.endsShort}` : trial.endsShort}
                />
                <PriceRow label="Cancel before then" value="Pay nothing" accent />
              </>
            ) : (
              <>
                <PriceRow label="Plan price" value={price ?? "Unavailable"} />
                <PriceRow label="First charge" value="Today" />
                <PriceRow label="Cancel anytime" value="In Settings" accent />
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* The frame centres the list as a block, with the rows left-aligned to
          the longest one rather than each row centred on its own. */}
      <View className="max-w-full gap-lg self-center">
        {TRIAL_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-sm">
            <SealCheck size={FEATURE_ICON} color={colors.primaryBright} />
            <Text variant="body" color="dark" className="shrink">
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingStep>
  );
}

function PriceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-md">
      <Text variant="label" color="light70">
        {label}
      </Text>
      <Text variant="label" color={accent ? "accent" : "light"} className="shrink font-semibold">
        {value}
      </Text>
    </View>
  );
}
