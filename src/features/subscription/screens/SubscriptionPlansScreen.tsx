import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Check, SealCheck, X } from "phosphor-react-native";
import { BackButton, Button, Screen, Segmented, Text } from "@/components";
import type { SubscriptionPlan } from "@/contracts";
import { colors } from "@/theme";
import {
  useCancelSubscription,
  usePurchaseSubscription,
  useStartTrial,
  useSubscription,
} from "../index";

const FEATURES = [
  "Unlimited food logging & barcode scanner",
  "Meal recommendations tailored to your goal",
  "Weekly progress reports & trend charts",
  "Apple Health & Google Fit sync",
];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatLongDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function planPrice(plan: SubscriptionPlan) {
  return plan === "annual"
    ? { price: "$150", period: "year", save: "Save $29", after: "$150/year" }
    : { price: "$14.99", period: "month", save: "14-day free trial", after: "$14.99/month" };
}

function ModalShell({
  tone,
  title,
  body,
  children,
}: {
  tone: "danger" | "success";
  title: string;
  body: string;
  children: ReactNode;
}) {
  const isSuccess = tone === "success";
  return (
    <View className="flex-1 items-center justify-center bg-black/30 px-xl">
      <View className="w-full gap-lg rounded-lg bg-white p-xl">
        <View
          className={`h-[48px] w-[48px] items-center justify-center self-center rounded-full ${
            isSuccess ? "bg-primarySoft" : "bg-red-100"
          }`}
        >
          {isSuccess ? (
            <Check size={26} color={colors.primaryBright} />
          ) : (
            <X size={26} color={colors.error} />
          )}
        </View>
        <Text className="text-center font-semibold text-[18px]">{title}</Text>
        <Text color="dark" className="text-center leading-[24px]">
          {body}
        </Text>
        {children}
      </View>
    </View>
  );
}

export function SubscriptionPlansScreen() {
  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const subscription = useSubscription();
  const startTrial = useStartTrial();
  const purchase = usePurchaseSubscription();
  const cancel = useCancelSubscription();

  const sub = subscription.data?.subscription;
  const selected = planPrice(plan);
  const trialDays = sub?.trialDays ?? 14;
  const trialEnd = useMemo(() => addDays(new Date(), trialDays), [trialDays]);
  const firstChargeDate = formatShortDate(trialEnd);
  const firstChargeLabel = `${selected.price} on ${firstChargeDate}`;
  const hasPremiumAccess = sub?.entitlement === "premium";
  const canStartTrial = !hasPremiumAccess && !sub?.trialUsed;
  const canSubscribe = !hasPremiumAccess && Boolean(sub?.trialUsed);
  const accessEndsAt = sub?.accessEndsAt ? formatLongDate(sub.accessEndsAt) : "";

  useEffect(() => {
    if (!cancelledOpen) return undefined;
    const timeout = setTimeout(() => {
      setCancelledOpen(false);
      router.replace("/(app)/dashboard");
    }, 30000);
    return () => clearTimeout(timeout);
  }, [cancelledOpen]);

  const primaryAction = () => {
    if (canStartTrial) {
      startTrial.mutate({ plan });
    } else if (canSubscribe) {
      purchase.mutate({ plan });
    }
  };

  const primaryLabel = canStartTrial
    ? "Start free trial — $0 today"
    : plan === "annual"
      ? "Subscribe annual"
      : "Subscribe monthly";

  return (
    <Screen scroll backgroundColor={colors.light} style={{ gap: 18, paddingBottom: 120 }}>
      <View className="flex-row items-center gap-md">
        <BackButton onPress={() => router.back()} />
        <Text variant="heading2">Subscription plans</Text>
      </View>

      <Segmented
        value={plan}
        onChange={setPlan}
        options={[
          { label: "Monthly", value: "monthly" },
          { label: "Annual", value: "annual" },
        ]}
      />

      <Text color="muted" className="text-[16px] leading-[24px]">
        Full access for {trialDays} days, then {selected.after}. Cancel any time.
      </Text>

      <View
        className={`overflow-hidden rounded-lg border border-primaryBright p-xl ${
          plan === "annual" ? "bg-primary" : "bg-primarySoft"
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text className={`font-semibold text-[40px] ${plan === "annual" ? "text-white" : ""}`}>
              {selected.price}
              <Text className={`text-[18px] ${plan === "annual" ? "text-white" : "text-gray-500"}`}>
                {" "}
                / {selected.period}
              </Text>
            </Text>
            <Text
              color={plan === "annual" ? "inverse" : "dark"}
              className={`font-semibold ${plan === "annual" ? "" : "text-warning"}`}
            >
              {selected.save}
            </Text>
          </View>
          {plan === "annual" ? (
            <View className="rounded-md bg-warning px-md py-sm">
              <Text className="font-semibold text-[13px]">Best value</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-xl gap-md">
          <PriceRow
            label="Trial ends"
            value={formatShortDate(trialEnd)}
            inverted={plan === "annual"}
          />
          <PriceRow label="First charge" value={firstChargeLabel} inverted={plan === "annual"} />
          <PriceRow
            label="Cancel before then"
            value="Pay nothing"
            highlight
            inverted={plan === "annual"}
          />
        </View>
      </View>

      <View className="rounded-lg border border-yellow-200 bg-yellow-50 px-lg py-md">
        <Text className="font-semibold text-yellow-800">How to cancel in 2 taps</Text>
        <Text className="mt-xs text-yellow-800">Settings → Subscription → Cancel</Text>
      </View>

      <View className="gap-lg">
        {FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-md">
            <SealCheck size={22} color={colors.primaryBright} />
            <Text className="flex-1">{feature}</Text>
          </View>
        ))}
      </View>

      {hasPremiumAccess ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-[48px] items-center justify-center"
          onPress={() => setConfirmCancelOpen(true)}
        >
          <Text color="error" className="font-semibold">
            Cancel subscription
          </Text>
        </Pressable>
      ) : (
        <View className="gap-md">
          <Text color="muted" className="text-center">
            {canStartTrial
              ? `A card is required — you won't be charged until ${formatLongDate(trialEnd)}.`
              : `Subscribe to unlock full premium access with the ${plan} plan.`}
          </Text>
          <Button
            label={primaryLabel}
            loading={startTrial.isPending || purchase.isPending}
            onPress={primaryAction}
          />
          <Text color="muted" className="text-center">
            {canStartTrial
              ? `${selected.after} after ${formatShortDate(trialEnd)}. Cancel in Settings.`
              : "Cancel any time in Settings."}
          </Text>
        </View>
      )}

      <Modal visible={confirmCancelOpen} transparent animationType="fade">
        <ModalShell
          tone="danger"
          title="Cancel your subscription?"
          body={`You'll keep premium access until ${accessEndsAt || "the end of your billing period"}. No partial refunds.`}
        >
          <Button label="Keep premium" onPress={() => setConfirmCancelOpen(false)} />
          <Button
            label="Cancel my subscription"
            variant="secondary"
            loading={cancel.isPending}
            className="bg-red-100"
            onPress={() =>
              cancel.mutate(
                {},
                {
                  onSuccess: () => {
                    setConfirmCancelOpen(false);
                    setCancelledOpen(true);
                  },
                }
              )
            }
          />
        </ModalShell>
      </Modal>

      <Modal visible={cancelledOpen} transparent animationType="fade">
        <ModalShell
          tone="success"
          title="Subscription cancelled"
          body={`Confirmation sent to your email. Access continues until ${accessEndsAt || "the end of your billing period"}.`}
        >
          <Button
            label="Back to dashboard"
            variant="secondary"
            onPress={() => {
              setCancelledOpen(false);
              router.replace("/(app)/dashboard");
            }}
          />
        </ModalShell>
      </Modal>
    </Screen>
  );
}

function PriceRow({
  label,
  value,
  highlight = false,
  inverted = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  inverted?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/10 pb-sm">
      <Text className={`font-semibold ${inverted ? "text-white" : ""}`}>{label}</Text>
      <Text
        color="dark"
        className={`font-semibold ${highlight ? "text-warning" : ""} ${
          inverted && !highlight ? "text-white" : ""
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
