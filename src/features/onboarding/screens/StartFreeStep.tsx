import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SealCheck } from "phosphor-react-native";
import { Button, NoteBox, Segmented, Text } from "@/components";
import { colors } from "@/theme";
import { addDays, localDay } from "@/utils";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { STEP_NUMBER } from "@/features/onboarding/config";
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
import type { SubscriptionPlan } from "@/contracts";
import type { OnboardingStepProps } from "../types";

const STEP = STEP_NUMBER["start-free"];

/** The frame's four value props, in its order. */
const TRIAL_FEATURES = [
  "Unlimited food logging & barcode scanner",
  "Meal recommendations tailored to your goal",
  "Weekly progress reports & trend charts",
  "Apple Health & Google Fit sync",
];

const PLAN_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Annual", value: "annual" },
] as const satisfies readonly { label: string; value: SubscriptionPlan }[];

/**
 * What the annual plan saves against twelve monthly charges, in the store's own
 * currency. `null` unless both offers are known and annual is actually cheaper —
 * the frame's "Save $29" badge must never advertise a saving that isn't real.
 */
function annualSavings(
  monthly: SubscriptionProduct | undefined,
  annual: SubscriptionProduct | undefined
): string | null {
  if (!monthly || !annual) return null;
  const saved = monthly.price * 12 - annual.price;
  if (!(saved > 0)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: annual.currencyCode,
    maximumFractionDigits: 0,
  }).format(saved);
}

/**
 * Figma "Onboarding S6" metrics the shared step chrome does not carry, measured
 * off the frame. The panel sets more air above and below its content than
 * beside it, and the ledger sits further from the headline than the scale's 24.
 */
const CARD_PADDING_X = 21.333;
const CARD_PADDING_Y = 25.333;
const HEADLINE_TO_LEDGER = 28;
const FEATURE_ICON = 24;
/** The frame sets the panel and the feature list a little apart. */
const CONTENT_GAP = 21;

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
  // The frame opens on Annual, which is the plan it recommends.
  const [plan, setPlan] = useState<SubscriptionPlan>("annual");
  const product = productForPlan(offerings.data, plan);
  const savings = annualSavings(
    productForPlan(offerings.data, "monthly"),
    productForPlan(offerings.data, "annual")
  );
  const trial = trialDates(product);
  const price = product?.priceLabel;

  const startTrial = async () => {
    setError(null);
    try {
      if (!isBillingConfigured() || !product) throw new Error("Store offer unavailable");
      const result = await purchase.mutateAsync({
        plan,
        packageId: product.id,
        isTrial: product.hasFreeTrial,
      });
      if (!result.confirmed) throw new Error("Activation delayed");
      setFields({ onboardingStep: STEP });
      await submit("skip", { silent: false, onboardingStep: STEP });
      if (mode === "revisit") await onNext?.({ onboardingStep: STEP });
      else router.push("/(onboarding)/notifications");
    } catch {
      setError("We couldn't start your free trial. Please try again.");
    }
  };

  /**
   * Declining the trial is not leaving onboarding — it carries on to the
   * reminders step, the same as Continue does. That is why this one does not set
   * the skipped flag or submit: there is still a step to answer, and the draft
   * is written at the end of the flow like every other step's.
   */
  const skip = () => {
    setFields({ onboardingStep: STEP });
    if (mode === "revisit") {
      onDone?.();
      return;
    }
    router.push("/(onboarding)/notifications");
  };

  return (
    <OnboardingStep
      // S6 is the frame's closing screen, so it titles the page "Almost done"
      // and draws the track full.
      step={STEP}
      title="Start your free trial"
      contentGap={CONTENT_GAP}
      onBack={mode === "revisit" ? onBack : undefined}
      variant={variant}
      footer={
        <>
          {/* The card notice, the action and its small print are one block in
              the frame; only Skip sits a full gap away. */}
          <View className="gap-sm">
            <Text variant="caption" color="subtle" className="text-center font-regular">
              {trial
                ? `A card is required — you won't be charged until ${trial.endsLong}.`
                : "A card is required. You can cancel anytime in Settings."}
            </Text>
            <Button
              label="Continue"
              loading={isPending || isSaving || purchase.isPending || offerings.isLoading}
              onPress={() => void startTrial()}
            />
            {trial && price ? (
              <Text variant="caption" color="subtle" className="text-center font-regular">
                {`${price}/${product?.periodLabel ?? "month"} after ${trial.endsLong}. Cancel in Settings.`}
              </Text>
            ) : null}
            {error ? (
              <Text variant="caption" color="error" className="text-center" selectable>
                {error}
              </Text>
            ) : null}
          </View>
          <Button
            label="Skip for now"
            variant="ghost"
            disabled={isPending || isSaving}
            onPress={skip}
          />
        </>
      }
    >
      {/* The plan toggle sits between the title and the summary line, because
          the line quotes the selected plan's price. */}
      <Segmented
        fullWidth
        equalSegments
        activeBordered
        options={PLAN_OPTIONS}
        value={plan}
        onChange={setPlan}
      />

      <Text variant="body-sm" color="subtle">
        {trial && price
          ? `Full access for ${trial.days} days, then ${price}/${product?.periodLabel ?? "month"}. Cancel any time.`
          : "Everything Thrivo offers, unlocked. No hidden fees."}
      </Text>

      <View className="overflow-hidden rounded-panel border-[1.333px] border-trialPanelBorder">
        {/* Straight down, dark through the blend stop to the brand green — the
            frame puts the middle stop just under halfway. */}
        <LinearGradient
          colors={[colors.dark, colors.gradientMid, colors.primaryBright]}
          locations={[0, 0.49, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingHorizontal: CARD_PADDING_X, paddingVertical: CARD_PADDING_Y }}
        >
          <View className="flex-row items-end">
            <Text variant="hero" color="inverse" className="font-bold tracking-price">
              {price ?? "—"}
            </Text>
            <Text variant="body" color="light70" className="ml-sm">
              / {product?.periodLabel ?? "month"}
            </Text>
            {plan === "annual" && savings ? (
              <View className="ml-auto self-start rounded-chip bg-accent px-sm py-[2px]">
                <Text variant="caption" color="dark" className="font-medium">
                  Best value
                </Text>
              </View>
            ) : null}
          </View>

          {plan === "annual" && savings ? (
            <Text variant="body" color="accent" className="mt-xs font-bold">
              {`Save ${savings}`}
            </Text>
          ) : null}

          <View style={{ marginTop: HEADLINE_TO_LEDGER }}>
            {trial ? (
              <>
                <PriceRow label="Trial ends" value={trial.endsLong} />
                <PriceRow
                  label="First charge"
                  value={price ? `${price} on ${trial.endsShort}` : trial.endsShort}
                  divided
                />
                <PriceRow label="Cancel before then" value="Pay nothing" accent divided />
              </>
            ) : (
              <>
                <PriceRow label="Plan price" value={price ?? "Unavailable"} />
                <PriceRow label="First charge" value="Today" divided />
                <PriceRow label="Cancel anytime" value="In Settings" accent divided />
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      <NoteBox title="How to cancel in 2 taps">Settings → Subscription → Cancel</NoteBox>

      <View className="gap-md">
        {TRIAL_FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-sm">
            <SealCheck size={FEATURE_ICON} color={colors.primaryBright} />
            <Text variant="caption" color="dark" className="shrink font-regular">
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingStep>
  );
}

function PriceRow({
  label,
  value,
  accent,
  divided,
}: {
  label: string;
  value: string;
  accent?: boolean;
  /** The frame rules every row but the first off from the one above it. */
  divided?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between gap-md py-sm ${
        divided ? "border-t-[0.667px] border-white/10" : ""
      }`}
    >
      <Text variant="caption" color="light" className="font-semibold tracking-price">
        {label}
      </Text>
      <Text
        variant="caption"
        color={accent ? "accent" : "inverse"}
        className="shrink font-semibold"
      >
        {value}
      </Text>
    </View>
  );
}
