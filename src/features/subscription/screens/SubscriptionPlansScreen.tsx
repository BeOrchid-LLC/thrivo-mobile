import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Check, SealCheck, X } from "phosphor-react-native";
import { Button, PageHeader, Screen, Segmented, Text, useToast } from "@/components";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured } from "@/lib";
import { colors } from "@/theme";
import {
  productForPlan,
  useCancelSubscription,
  useOfferings,
  useOfferingsDiagnostics,
  usePurchaseSubscription,
  useRestorePurchases,
  useStartTrial,
  useSubscription,
} from "../index";

const FEATURES = [
  "Food, water, calories, and weight history beyond 14 days",
  "Longer trend charts across progress metrics",
  "Full food log history for reviewing patterns",
  "Premium insights as they become available",
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

/**
 * Fallback copy for when the store has not returned offerings (development
 * without billing keys, or a transient failure). Live store prices always win —
 * Apple and Google localise them per storefront, and a paywall that disagrees
 * with the purchase sheet is a review rejection.
 */
function planPrice(plan: SubscriptionPlan) {
  return plan === "annual"
    ? { price: "$150", period: "year", save: "Save $29", after: "$150/year" }
    : { price: "$14.99", period: "month", save: "14-day premium preview", after: "$14.99/month" };
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
        <Text variant="body-lg" className="text-center font-semibold">
          {title}
        </Text>
        <Text variant="body" color="dark" className="text-center">
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
  const offerings = useOfferings();
  useOfferingsDiagnostics(offerings);
  const startTrial = useStartTrial();
  const purchase = usePurchaseSubscription();
  const restore = useRestorePurchases();
  const cancel = useCancelSubscription();
  const { showToast } = useToast();

  const sub = subscription.data?.subscription;
  const storeProduct = productForPlan(offerings.data, plan);
  const fallback = planPrice(plan);
  const selected = storeProduct
    ? { ...fallback, price: storeProduct.priceLabel, after: storeProduct.priceLabel }
    : fallback;
  const billingLive = isBillingConfigured();
  // With billing live we can only sell what the store actually returned.
  const canTransact = !billingLive || Boolean(storeProduct);
  const trialDays = sub?.trialDays ?? 14;
  const trialEnd = useMemo(() => addDays(new Date(), trialDays), [trialDays]);
  const firstChargeDate = formatShortDate(trialEnd);
  const firstChargeLabel = `Paid plan after ${firstChargeDate}`;
  const hasPremiumAccess = sub?.entitlement === "premium";
  // With billing live the store is authoritative on trial eligibility — it, not
  // our `trialUsed` flag, decides whether the intro offer applies. A user who
  // already consumed the offer is simply charged full price.
  const trialAvailable = billingLive && storeProduct ? storeProduct.hasFreeTrial : !sub?.trialUsed;
  const canStartTrial = !hasPremiumAccess && trialAvailable;
  const canSubscribe = !hasPremiumAccess && !trialAvailable;
  const accessEndsAt = sub?.accessEndsAt ? formatLongDate(sub.accessEndsAt) : "";

  useEffect(() => {
    analytics.track("thrivo.paywall_viewed");
  }, []);

  useEffect(() => {
    if (!cancelledOpen) return undefined;
    const timeout = setTimeout(() => {
      setCancelledOpen(false);
      router.replace("/(app)/dashboard");
    }, 30000);
    return () => clearTimeout(timeout);
  }, [cancelledOpen]);

  const primaryAction = () => {
    // Without a store product there is nothing to charge against; the button is
    // disabled in that state, so this is a guard rather than a branch users hit.
    const productId = storeProduct?.id;
    if (billingLive && !productId) return;

    // A purchase that fails after the sheet opens (store outage, payment
    // declined) must say so — silence here reads as "the button is broken".
    // A dismissed sheet is not an error and resolves successfully.
    const onError = () =>
      showToast({
        message: "That didn't go through. You have not been charged.",
        variant: "error",
      });

    // A completed purchase must be confirmed in the app. The store's own sheet
    // dismisses itself, and entitlement can take a moment to come back from the
    // backend, so without this the screen looks unchanged and the user cannot
    // tell whether they just paid.
    const onSuccess = (result: { completed: boolean }) => {
      if (!result.completed) return; // dismissed sheet — nothing to announce
      showToast({
        message: canStartTrial ? "Your premium preview has started." : "Premium unlocked.",
        variant: "success",
      });
    };

    if (canStartTrial) {
      startTrial.mutate({ plan, productId }, { onError, onSuccess });
    } else if (canSubscribe) {
      purchase.mutate({ plan, productId, isTrial: false }, { onError, onSuccess });
    }
  };

  const primaryLabel = canStartTrial
    ? "Start premium preview"
    : plan === "annual"
      ? "Activate annual preview"
      : "Activate monthly preview";

  return (
    <Screen scroll backgroundColor={colors.light} style={{ gap: 18, paddingBottom: 120 }}>
      <PageHeader title="Subscription plans" />

      <Segmented
        value={plan}
        onChange={setPlan}
        options={[
          { label: "Monthly", value: "monthly" },
          { label: "Annual", value: "annual" },
        ]}
      />

      <Text variant="body" color="muted">
        Premium unlocks activity history and trend charts beyond 14 days.
      </Text>

      <View
        className={`overflow-hidden rounded-lg border border-primaryBright p-xl ${
          plan === "annual" ? "bg-primary" : "bg-primarySoft"
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text variant="heading1" color={plan === "annual" ? "inverse" : "dark"}>
              {selected.price}
              <Text variant="body-lg" color={plan === "annual" ? "inverse" : "gray500"}>
                {" "}
                / {selected.period}
              </Text>
            </Text>
            <Text color={plan === "annual" ? "inverse" : "warning"} className="font-semibold">
              {selected.save}
            </Text>
          </View>
          {plan === "annual" ? (
            <View className="rounded-md bg-warning px-md py-sm">
              <Text variant="caption">Best value</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-xl gap-md">
          <PriceRow
            label="Preview ends"
            value={formatShortDate(trialEnd)}
            inverted={plan === "annual"}
          />
          <PriceRow label="Plan price" value={selected.after} inverted={plan === "annual"} />
          <PriceRow
            label={firstChargeLabel}
            value="Pay nothing"
            highlight
            inverted={plan === "annual"}
          />
        </View>
      </View>

      {billingLive ? null : (
        <View className="rounded-lg border border-yellow-200 bg-yellow-50 px-lg py-md">
          <Text color="warningText" className="font-semibold">
            Store billing not configured
          </Text>
          <Text color="warningText" className="mt-xs">
            No payment is collected in this build.
          </Text>
        </View>
      )}

      <View className="gap-lg">
        {FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-md">
            <SealCheck size={22} color={colors.primaryBright} />
            <Text className="flex-1">{feature}</Text>
          </View>
        ))}
      </View>

      {billingLive ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-[48px] items-center justify-center"
          disabled={restore.isPending}
          onPress={() =>
            restore.mutate(undefined, {
              onSuccess: (result) =>
                showToast(
                  result.entitlement === "premium"
                    ? { message: "Premium restored.", variant: "success" }
                    : { message: "No previous purchases found on this account.", variant: "error" }
                ),
              onError: () =>
                showToast({ message: "We couldn't restore purchases.", variant: "error" }),
            })
          }
        >
          <Text color="primary" className="font-semibold">
            {restore.isPending ? "Restoring…" : "Restore purchases"}
          </Text>
        </Pressable>
      ) : null}

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
              ? `Preview access runs through ${formatLongDate(trialEnd)}.`
              : `Activate premium access with the ${plan} plan preview.`}
          </Text>
          {offerings.isLoading ? (
            // Still fetching: neither a purchase button nor a failure message is
            // honest yet.
            <Button label="Loading plans…" disabled onPress={() => undefined} />
          ) : canTransact ? (
            <>
              <Button
                // Only a purchase in flight should spin. Tying this to the
                // offerings query left the button spinning *and* disabled
                // whenever the store was slow — a dead control, no explanation.
                label={offerings.isLoading ? "Loading plans…" : primaryLabel}
                loading={startTrial.isPending || purchase.isPending}
                disabled={offerings.isLoading}
                onPress={primaryAction}
              />
              <Text color="muted" className="text-center">
                {canStartTrial
                  ? "Cancel any time from Settings before the preview ends."
                  : "You'll be charged through your app store account."}
              </Text>
            </>
          ) : (
            // No purchasable product: render the reason and a retry instead of a
            // button that looks tappable but silently does nothing.
            <View className="gap-sm">
              <Text color="error" className="text-center">
                We couldn&apos;t load plans from the App Store.
              </Text>
              {__DEV__ && offerings.error instanceof Error ? (
                <Text variant="caption" color="muted" className="text-center">
                  {offerings.error.message}
                </Text>
              ) : null}
              <Button
                label="Try again"
                variant="secondary"
                loading={offerings.isFetching}
                onPress={() => void offerings.refetch()}
              />
            </View>
          )}
        </View>
      )}

      <Modal visible={confirmCancelOpen} transparent animationType="fade">
        <ModalShell
          tone="danger"
          title="Cancel your subscription?"
          body={
            billingLive
              ? `We'll take you to your app store subscription settings to cancel. You'll keep premium access until ${accessEndsAt || "the end of your billing period"}.`
              : `You'll keep premium access until ${accessEndsAt || "the end of your billing period"}. No partial refunds.`
          }
        >
          <Button label="Keep premium" onPress={() => setConfirmCancelOpen(false)} />
          <Button
            label={billingLive ? "Manage in app store" : "Cancel my subscription"}
            variant="secondary"
            loading={cancel.isPending}
            className="bg-red-100"
            onPress={() =>
              cancel.mutate(
                {},
                {
                  onSuccess: (result) => {
                    setConfirmCancelOpen(false);
                    // Only claim it is cancelled when we actually recorded it.
                    // Store cancellations complete outside the app.
                    if (!result.openedStore) setCancelledOpen(true);
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
      <Text color={inverted ? "inverse" : "dark"} className="font-semibold">
        {label}
      </Text>
      <Text color={highlight ? "warning" : inverted ? "inverse" : "dark"} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
