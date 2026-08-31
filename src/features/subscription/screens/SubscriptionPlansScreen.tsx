import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { ArrowsClockwise, SealCheck } from "phosphor-react-native";
import {
  BlockingLoader,
  Button,
  NoteBox,
  PageHeader,
  Screen,
  Segmented,
  Text,
  useToast,
} from "@/components";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured, type SubscriptionProduct } from "@/lib";
import { colors, sizing } from "@/theme";
import { addDays, formatLongDate, localDay } from "@/utils";
import { CancelSubscriptionDialogs } from "../components/CancelSubscriptionDialogs";
import { PlanCard, type PlanCardRow } from "../components/PlanCard";
import {
  productForPlan,
  useOfferings,
  useOfferingsDiagnostics,
  usePurchaseSubscription,
  useRestorePurchases,
  useStartTrial,
  useSubscription,
} from "../index";

/** The frame's four value props, in its order. */
const FEATURES = [
  "Unlimited food logging & barcode scanner",
  "Meal recommendations tailored to your goal",
  "Weekly progress reports & trend charts",
  "Apple Health & Google Fit sync",
];

/** Whichever store this build actually talks to — "App Store" on a Play device
 * is the kind of detail that makes an error message look like a bug. */
const STORE_NAME = Platform.OS === "android" ? "Play Store" : "App Store";

const PLAN_LABEL: Record<SubscriptionPlan, string> = { monthly: "Monthly", annual: "Annual" };
const PERIOD: Record<SubscriptionPlan, string> = { monthly: "month", annual: "year" };
/** Trial length to quote before the store has answered with the real one. */
const FALLBACK_TRIAL_DAYS = 14;

function otherPlan(plan: SubscriptionPlan): SubscriptionPlan {
  return plan === "monthly" ? "annual" : "monthly";
}

/** "20 Jun 2026" / "20 Jun" — the frame's date form. */
function formatDay(day: string, withYear: boolean): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(year, month - 1, date));
}

/**
 * The dates the frame quotes, derived from the trial length the store itself
 * reports so the paywall and the purchase sheet can never disagree.
 */
function trialDates(days: number) {
  const endsOn = addDays(localDay(), days);
  return { days, endsLong: formatDay(endsOn, true), endsShort: formatDay(endsOn, false) };
}

/**
 * What a year on the annual plan saves against twelve months of the monthly
 * one. `null` whenever the store has not priced both plans — a savings claim we
 * cannot compute from live prices is one we must not make.
 */
function annualSaving(
  monthly: SubscriptionProduct | undefined,
  annual: SubscriptionProduct | undefined
): string | null {
  if (!monthly?.price || !annual?.price) return null;
  // Floored, never rounded: rounding 29.88 up to 30 would advertise a saving
  // the store does not actually give.
  const saved = Math.floor(monthly.price * 12 - annual.price);
  if (saved <= 0) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: annual.currencyCode || monthly.currencyCode,
      maximumFractionDigits: 0,
    }).format(saved);
  } catch {
    return null;
  }
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/10 pb-sm">
      <Text color="dark" className="font-semibold">
        {label}
      </Text>
      <Text color={tone === "warning" ? "warning" : "dark"} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}

/**
 * Subscription management.
 *
 * A subscription is not a free/premium switch — it moves through states the app
 * does not control, and each one affords different actions:
 *
 * - **none / expired** — nothing active. Offer the plans, with the free trial if
 *   the store still has an introductory offer available.
 * - **trialing** — paying nothing yet, charged on a known date. The useful
 *   actions are switching plan and cancelling before that date.
 * - **active** — renews automatically. Show when and for how much, and offer to
 *   switch plan or cancel.
 * - **canceled with access remaining** — already cancelled but still premium
 *   until the period ends. The only sensible action is resubscribing, and it
 *   must not read as if they still have an active plan.
 *
 * Cancelling and resuming both happen in the store, because Apple and Google do
 * not let an app do either on the user's behalf.
 *
 * The plans state is drawn to the Figma "Subscription Plans" frame: the header
 * and the purchase actions are pinned, and only the plan itself scrolls — the
 * price and the button a user is deciding between are never both off-screen.
 */
export function SubscriptionPlansScreen() {
  const subscription = useSubscription();
  const offerings = useOfferings();
  useOfferingsDiagnostics(offerings);
  const startTrial = useStartTrial();
  const purchase = usePurchaseSubscription();
  const restore = useRestorePurchases();
  const { showToast } = useToast();

  const sub = subscription.data?.subscription;
  const currentPlan = sub?.plan ?? null;
  const status = sub?.status ?? "none";
  const billingLive = isBillingConfigured();

  // Which plan the picker is showing. Defaults to the current one so "switch
  // plan" starts from where the user actually is.
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(currentPlan ?? "monthly");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const isPremium = sub?.entitlement === "premium";
  const isTrialing = status === "trialing";
  const willNotRenew = Boolean(sub?.cancelAtPeriodEnd) || status === "canceled";
  // Premium that is winding down: still usable, but nothing will be charged again.
  const isLapsing = isPremium && willNotRenew;

  const storeProduct = productForPlan(offerings.data, selectedPlan);
  const backendPlan = sub?.plans?.find((p) => p.plan === selectedPlan);
  const priceLabel = storeProduct?.priceLabel ?? backendPlan?.priceLabel ?? null;
  const periodLabel = storeProduct?.periodLabel ?? PERIOD[selectedPlan];
  const trialAvailable = billingLive && storeProduct ? storeProduct.hasFreeTrial : !sub?.trialUsed;
  const canTransact = billingLive && Boolean(storeProduct);
  // The switch button buys the *other* plan, so it has to be gated on that
  // plan's product — not on `selectedPlan`, which is pinned to the plan the
  // user is already on. Keying it to the wrong one either disables a switch
  // that would work, or enables one that silently does nothing.
  const switchTarget = currentPlan ? otherPlan(currentPlan) : null;
  const canSwitch =
    billingLive && Boolean(switchTarget && productForPlan(offerings.data, switchTarget));
  const trial = trialAvailable
    ? trialDates(storeProduct?.trialDays ?? sub?.trialDays ?? FALLBACK_TRIAL_DAYS)
    : null;
  const saving =
    selectedPlan === "annual"
      ? annualSaving(productForPlan(offerings.data, "monthly"), storeProduct)
      : null;

  useEffect(() => {
    analytics.track("thrivo.paywall_viewed");
  }, []);

  // Keep the picker in step once the server tells us what they are on.
  useEffect(() => {
    if (currentPlan) setSelectedPlan(currentPlan);
  }, [currentPlan]);

  const buy = (plan: SubscriptionPlan, { asTrial }: { asTrial: boolean }) => {
    const productId = productForPlan(offerings.data, plan)?.id;
    if (billingLive && !productId) {
      // Silently doing nothing reads as a broken button. Say why instead.
      showToast({
        message: `The ${PLAN_LABEL[plan].toLowerCase()} plan isn't available from the store right now.`,
        variant: "error",
      });
      return;
    }

    const onError = () =>
      showToast({
        message: "That didn't go through. You have not been charged.",
        variant: "error",
      });
    // `confirmed` is the backend's answer, not the store's. The store can accept
    // payment while `/subscriptions/sync` is still catching up, and telling
    // someone premium is active before the backend agrees means the very next
    // screen they open is still locked. Say what actually happened instead.
    const onSuccess = (result: { completed: boolean; confirmed?: boolean; error?: unknown }) => {
      if (!result.completed) return; // dismissed sheet — nothing to announce
      showToast({
        message: result.confirmed
          ? asTrial
            ? // No money moved yet — saying "paid" here would be a lie, and the
              // card-required trial already makes people wary of a charge.
              "Your free trial has started. Premium is active."
            : "Payment successful. Premium is active."
          : result.error
            ? // Every sync attempt errored — this is not a slow activation, it
              // is a broken one, and telling someone to "try again shortly"
              // sends them round a loop that cannot resolve itself.
              "Purchase received, but we couldn't activate it. Please contact support."
            : // Payment succeeded and activation is still catching up. The hook
              // keeps checking in the background and unlocks the app on its own,
              // so this is news, not an error — and must not read like one to
              // someone who has just been charged.
              "Payment successful. Premium unlocks in a moment.",
        // Only a genuine failure is an error. A slow activation is not.
        variant: result.confirmed || !result.error ? "success" : "error",
      });
    };

    if (asTrial) startTrial.mutate({ plan, productId }, { onError, onSuccess });
    else purchase.mutate({ plan, packageId: productId, isTrial: false }, { onError, onSuccess });
  };

  const isWorking = startTrial.isPending || purchase.isPending;

  const planRows: PlanCardRow[] = trial
    ? [
        { label: "Trial ends", value: trial.endsLong },
        {
          label: "First charge",
          value: priceLabel ? `${priceLabel} on ${trial.endsShort}` : trial.endsShort,
        },
        { label: "Cancel before then", value: "Pay nothing", accent: true },
      ]
    : [
        { label: "Plan price", value: priceLabel ?? "Unavailable" },
        { label: "First charge", value: "Today" },
        { label: "Cancel anytime", value: "In Settings", accent: true },
      ];

  /**
   * The purchase actions, pinned. Everything that decides whether money moves —
   * the disclosure, the button, and what happens after the trial — stays on
   * screen while the plan scrolls behind it.
   */
  const purchaseFooter = offerings.isLoading ? (
    <Button label="Loading plans…" disabled onPress={() => undefined} />
  ) : canTransact ? (
    <View className="gap-md">
      <Text variant="body-sm" color="muted" className="text-center">
        {trial
          ? `A card is required — you won't be charged until ${trial.endsLong}.`
          : "You'll be charged through your app store account. Cancel any time."}
      </Text>
      <Button
        label={
          trial
            ? "Start free trial — $0 today"
            : priceLabel
              ? `Subscribe — ${priceLabel}`
              : `Subscribe ${PLAN_LABEL[selectedPlan].toLowerCase()}`
        }
        loading={isWorking}
        onPress={() => buy(selectedPlan, { asTrial: trialAvailable })}
      />
      <Text variant="caption" color="subtle" className="text-center font-regular">
        {trial
          ? `${priceLabel ?? "The plan price"}/${periodLabel} after ${trial.endsLong}. Cancel in Settings.`
          : "Cancel any time in Settings."}
      </Text>
    </View>
  ) : (
    <View className="gap-sm">
      <Text color="error" className="text-center">
        We couldn&apos;t load plans from the {STORE_NAME}.
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
  );

  return (
    <Screen
      scroll
      rhythm="default"
      backgroundColor={colors.light}
      header={<PageHeader title={isPremium ? "Your subscription" : "Subscription plans"} />}
      footer={isPremium ? undefined : purchaseFooter}
    >
      {/* Held only once the store has handed back and we are waiting on our own
          backend — never while the store's sheet is up, which on Android sits
          below an RN modal and would have its taps swallowed. */}
      <BlockingLoader
        visible={purchase.awaitingActivation || startTrial.awaitingActivation || restore.isPending}
        message={
          restore.isPending
            ? "Restoring your purchases…"
            : "Completing your purchase — don't close the app."
        }
      />
      {isPremium ? (
        <>
          {/* Current subscription — what they have, what happens next. */}
          <View
            className={`overflow-hidden rounded-lg border p-xl ${
              isLapsing ? "border-yellow-300 bg-yellow-50" : "border-primaryBright bg-primarySoft"
            }`}
          >
            <Text variant="heading3" color="dark">
              Thrivo Premium · {currentPlan ? PLAN_LABEL[currentPlan] : "Active"}
            </Text>
            <Text color={isLapsing ? "warningText" : "gray500"} className="mt-xs font-semibold">
              {isLapsing
                ? "Cancelled — will not renew"
                : isTrialing
                  ? "Free trial"
                  : "Active subscription"}
            </Text>

            <View className="mt-xl gap-md">
              {isLapsing ? (
                <DetailRow
                  label="Access ends"
                  value={formatLongDate(sub?.accessEndsAt) || "End of billing period"}
                  tone="warning"
                />
              ) : isTrialing ? (
                <>
                  <DetailRow
                    label="Trial ends"
                    value={formatLongDate(sub?.accessEndsAt ?? sub?.renewsAt) || "—"}
                  />
                  <DetailRow label="Then you pay" value={sub?.priceLabel ?? priceLabel ?? "—"} />
                </>
              ) : (
                <>
                  <DetailRow label="Renews on" value={formatLongDate(sub?.renewsAt) || "—"} />
                  <DetailRow label="Price" value={sub?.priceLabel ?? priceLabel ?? "—"} />
                </>
              )}
            </View>
          </View>

          {isLapsing ? (
            <View className="gap-md">
              <Text color="muted" className="text-center">
                You keep premium until {formatLongDate(sub?.accessEndsAt) || "the period ends"}.
                Resubscribe any time to keep it.
              </Text>
              <Button
                label={`Resubscribe ${currentPlan ? PLAN_LABEL[currentPlan].toLowerCase() : ""}`.trim()}
                loading={isWorking}
                disabled={!canTransact}
                onPress={() => buy(currentPlan ?? "monthly", { asTrial: false })}
              />
            </View>
          ) : (
            <View className="gap-md">
              {currentPlan ? (
                <Button
                  label={`Switch to ${PLAN_LABEL[otherPlan(currentPlan)].toLowerCase()}`}
                  variant="secondary"
                  loading={isWorking}
                  disabled={!canSwitch}
                  onPress={() => buy(otherPlan(currentPlan), { asTrial: false })}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                className="min-h-control items-center justify-center"
                onPress={() => setConfirmCancelOpen(true)}
              >
                <Text color="error" className="font-semibold">
                  Cancel subscription
                </Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <>
          <View className="gap-lg">
            <Segmented
              value={selectedPlan}
              onChange={setSelectedPlan}
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Annual", value: "annual" },
              ]}
            />
            <Text variant="body-sm" color="muted">
              {trial
                ? `Full access for ${trial.days} days, then ${priceLabel ?? "the plan price"}/${periodLabel}. Cancel any time.`
                : `${priceLabel ?? "The plan price"} per ${periodLabel}. Cancel any time.`}
            </Text>
          </View>

          {/* The annual plan wears the app's premium surface and carries the
              saving; the monthly one is its soft-green twin. Same card, so
              switching plan moves nothing but the numbers. */}
          <PlanCard
            tone={selectedPlan === "annual" ? "dark" : "light"}
            priceLabel={priceLabel ?? "—"}
            periodLabel={periodLabel}
            headline={
              saving ? `Save ${saving}` : trial ? `${trial.days}-day free trial` : "Cancel anytime"
            }
            badge={selectedPlan === "annual" && saving ? "Best value" : undefined}
            rows={planRows}
          />

          <NoteBox title="How to cancel in 2 taps">Settings → Subscription → Cancel</NoteBox>

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
        </>
      )}

      <View className="gap-lg">
        {FEATURES.map((feature) => (
          <View key={feature} className="flex-row items-center gap-md">
            <SealCheck size={sizing.iconSm} color={colors.primary} />
            <Text variant="body-sm" className="flex-1">
              {feature}
            </Text>
          </View>
        ))}
      </View>

      {billingLive ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-control flex-row items-center justify-center gap-sm"
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
          <ArrowsClockwise size={18} color={colors.primary} />
          <Text color="primary" className="font-semibold">
            {restore.isPending ? "Restoring…" : "Restore purchases"}
          </Text>
        </Pressable>
      ) : null}

      <CancelSubscriptionDialogs
        visible={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        accessEndsAt={sub?.accessEndsAt}
        renewsAt={sub?.renewsAt}
      />
    </Screen>
  );
}
