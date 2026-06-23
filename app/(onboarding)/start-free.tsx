import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, CheckIcon, Text } from "@/components";
import { colors } from "@/theme";
import { addDays, localDay } from "@/utils";
import { OnboardingStep } from "@/features/onboarding/components/OnboardingStep";
import { NoteBox } from "@/features/onboarding/components/NoteBox";
import { useSubmitOnboarding } from "@/features/onboarding/hooks/useCompleteOnboarding";
import { useSessionActions } from "@/stores";
import { MONTHLY_PRICE_DISPLAY, TRIAL_DAYS } from "@/config/pricing";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TRIAL_FEATURES = [
  "Unlimited food logging & barcode scanner",
  "Meal recommendations tailored to your goal",
  "Weekly progress reports & trend charts",
  "Apple Health & Google Fit sync",
];

export default function StartFreeStep() {
  const { submit, isPending } = useSubmitOnboarding();
  const { setIsOnboarded } = useSessionActions();
  const [error, setError] = useState<string | null>(null);

  const [y, m, d] = addDays(localDay(), TRIAL_DAYS).split("-").map(Number);
  const trialEndLong = `${d} ${MONTHS[m - 1]} ${y}`;
  const trialEndShort = `${d} ${MONTHS[m - 1]}`;

  const startTrial = async () => {
    setError(null);
    try {
      await submit("start_free_trial", { onboardingStep: 6 });
      router.push("/(onboarding)/notifications");
    } catch {
      setError("We couldn't start your trial. Please try again.");
    }
  };

  const skip = () => {
    setIsOnboarded(true);
    router.replace("/(app)/dashboard");
    void submit("skip", { silent: true, onboardingStep: 6 });
  };

  return (
    <OnboardingStep
      step={6}
      title="Start your free trial"
      subtitle={`Full access for 7 days, then ${MONTHLY_PRICE_DISPLAY}/month. Cancel anytime.`}
      footer={
        <>
          <Button label="Start free trial — $0 today" loading={isPending} onPress={startTrial} />
          <Text variant="caption" color="muted" className="text-center font-regular">
            {MONTHLY_PRICE_DISPLAY}/month after {trialEndLong}. Cancel in Settings.
          </Text>
          <Button label="Skip for now" variant="ghost" disabled={isPending} onPress={skip} />
          {error ? (
            <Text variant="caption" color="error" className="text-center" selectable>
              {error}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="overflow-hidden rounded-[20px] border-[1.333px] border-[#0b8d42]">
        <LinearGradient
          colors={[colors.dark, "#2D5B4A", colors.primaryBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 24 }}
        >
          {/* Decorative circles echoing the Figma card flourish. */}
          <View className="absolute -right-10 -top-10 h-[110px] w-[110px] rounded-pill bg-white/10" />
          <View className="absolute -bottom-6 right-12 h-[64px] w-[64px] rounded-pill bg-white/10" />

          <View className="flex-row items-end">
            <Text className="font-bold text-[36px] leading-[40px] text-light">
              {MONTHLY_PRICE_DISPLAY}
            </Text>
            <Text className="mb-[3px] ml-xs text-[16px] leading-[24px] text-light/70">/ month</Text>
          </View>
          <Text className="mt-xs font-bold text-[16px] leading-[24px] text-accent">
            7-day free trial
          </Text>

          <View className="mt-md gap-sm">
            <PriceRow label="Trial ends" value={trialEndLong} />
            <PriceRow label="First charge" value={`${MONTHLY_PRICE_DISPLAY} on ${trialEndShort}`} />
            <PriceRow label="Cancel before then" value="Pay nothing" accent />
          </View>
        </LinearGradient>
      </View>

      <NoteBox title="How to cancel in 2 taps">Settings → Subscription → Cancel</NoteBox>

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
        A card is required — you won&apos;t be charged until {trialEndLong}.
      </Text>
    </OnboardingStep>
  );
}

function PriceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-[14px] leading-[20px] text-light/70">{label}</Text>
      <Text
        className={`font-semibold text-[14px] leading-[20px] ${accent ? "text-accent" : "text-light"}`}
      >
        {value}
      </Text>
    </View>
  );
}
