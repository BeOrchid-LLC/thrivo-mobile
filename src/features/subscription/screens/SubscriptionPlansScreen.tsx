import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { ArrowsClockwise, Check, CrownSimple, SealCheck, X } from "phosphor-react-native";
import {
  Button,
  PageHeader,
  PremiumSurface,
  Screen,
  Segmented,
  Text,
  useToast,
} from "@/components";
import type { SubscriptionPlan } from "@/contracts";
import { analytics, isBillingConfigured } from "@/lib";
import { colors, rhythm } from "@/theme";
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

const PLAN_LABEL: Record<SubscriptionPlan, string> = { monthly: "Monthly", annual: "Annual" };
const PERIOD: Record<SubscriptionPlan, string> = { monthly: "month", annual: "year" };

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function otherPlan(plan: SubscriptionPlan): SubscriptionPlan {
  return plan === "monthly" ? "annual" : "monthly";
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
          className={`h-badge w-badge items-center justify-center self-center rounded-full ${
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

/** Detail row for the dark premium surface — light text, hairline divider. */
function PlanRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-b border-white/[0.14] pb-sm">
      <Text variant="body" color="light70">
        {label}
      </Text>
      <Text variant="body" color={accent ? "accent" : "light"} className="font-semibold">
        {value}
      </Text>
    </View>
  );
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
 */
export function SubscriptionPlansScreen() {
  const subscription = useSubscription();
  const offerings = useOfferings();
  useOfferingsDiagnostics(offerings);
  const startTrial = useStartTrial();
  const purchase = usePurchaseSubscription();
  const restore = useRestorePurchases();
  const cancel = useCancelSubscription();
  const { showToast } = useToast();

  const sub = subscription.data?.subscription;
  const currentPlan = sub?.plan ?? null;
  const status = sub?.status ?? "none";
  const billingLive = isBillingConfigured();

  // Which plan the picker is showing. Defaults to the current one so "switch
  // plan" starts from where the user actually is.
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(currentPlan ?? "monthly");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);

  const isPremium = sub?.entitlement === "premium";
  const isTrialing = status === "trialing";
  const willNotRenew = Boolean(sub?.cancelAtPeriodEnd) || status === "canceled";
  // Premium that is winding down: still usable, but nothing will be charged again.
  const isLapsing = isPremium && willNotRenew;

  const storeProduct = productForPlan(offerings.data, selectedPlan);
  const backendPlan = sub?.plans?.find((p) => p.plan === selectedPlan);
  const priceLabel = storeProduct?.priceLabel ?? backendPlan?.priceLabel ?? null;
  const trialAvailable = billingLive && storeProduct ? storeProduct.hasFreeTrial : !sub?.trialUsed;
  const canTransact = !billingLive || Boolean(storeProduct);

  useEffect(() => {
    analytics.track("thrivo.paywall_viewed");
  }, []);

  // Keep the picker in step once the server tells us what they are on.
  useEffect(() => {
    if (currentPlan) setSelectedPlan(currentPlan);
  }, [currentPlan]);

  useEffect(() => {
    if (!cancelledOpen) return undefined;
    const timeout = setTimeout(() => {
      setCancelledOpen(false);
      router.replace("/(app)/(tabs)/dashboard");
    }, 30000);
    return () => clearTimeout(timeout);
  }, [cancelledOpen]);

  const buy = (plan: SubscriptionPlan, { asTrial }: { asTrial: boolean }) => {
    const productId = productForPlan(offerings.data, plan)?.id;
    if (billingLive && !productId) return;

    const onError = () =>
      showToast({
        message: "That didn't go through. You have not been charged.",
        variant: "error",
      });
    // `confirmed` is the backend's answer, not the store's. The store can accept
    // payment while `/subscriptions/sync` is still catching up, and telling
    // someone premium is active before the backend agrees means the very next
    // screen they open is still locked. Say what actually happened instead.
    const onSuccess = (result: { completed: boolean; confirmed?: boolean }) => {
      if (!result.completed) return; // dismissed sheet — nothing to announce
      showToast({
        message: result.confirmed
          ? asTrial
            ? "Your free trial has started."
            : "Premium is active."
          : "Purchase received. Activation is delayed; try again shortly.",
        variant: result.confirmed ? "success" : "error",
      });
    };

    if (asTrial) startTrial.mutate({ plan, productId }, { onError, onSuccess });
    else purchase.mutate({ plan, packageId: productId, isTrial: false }, { onError, onSuccess });
  };

  const isWorking = startTrial.isPending || purchase.isPending;

  return (
    <Screen
      scroll
      backgroundColor={colors.light}
      style={{ gap: rhythm.pageGap, paddingBottom: rhythm.tabBarClearance }}
      header={<PageHeader title={isPremium ? "Your subscription" : "Subscription plans"} />}
    >
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
                  value={formatDate(sub?.accessEndsAt) || "End of billing period"}
                  tone="warning"
                />
              ) : isTrialing ? (
                <>
                  <DetailRow
                    label="Trial ends"
                    value={formatDate(sub?.accessEndsAt ?? sub?.renewsAt) || "—"}
                  />
                  <DetailRow label="Then you pay" value={sub?.priceLabel ?? priceLabel ?? "—"} />
                </>
              ) : (
                <>
                  <DetailRow label="Renews on" value={formatDate(sub?.renewsAt) || "—"} />
                  <DetailRow label="Price" value={sub?.priceLabel ?? priceLabel ?? "—"} />
                </>
              )}
            </View>
          </View>

          {isLapsing ? (
            <View className="gap-md">
              <Text color="muted" className="text-center">
                You keep premium until {formatDate(sub?.accessEndsAt) || "the period ends"}.
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
                  disabled={!canTransact}
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
          <Segmented
            value={selectedPlan}
            onChange={setSelectedPlan}
            options={[
              { label: "Monthly", value: "monthly" },
              { label: "Annual", value: "annual" },
            ]}
          />

          <Text variant="body" color="muted">
            Premium unlocks activity history and trend charts beyond 14 days.
          </Text>

          {/* The paywall hero wears the same premium surface as the onboarding
              trial card and the in-context upgrade gate, so the paid tier looks
              like one recognisable thing wherever it is offered. */}
          <PremiumSurface raised>
            <View className="flex-row items-center gap-sm">
              <View className="h-badge w-badge items-center justify-center rounded-pill bg-accent/[0.16]">
                <CrownSimple size={22} color={colors.accent} weight="fill" />
              </View>
              <Text variant="caption" color="accent" className="uppercase tracking-label">
                Thrivo Premium
              </Text>
            </View>

            <View className="mt-lg flex-row items-end">
              <Text variant="hero" color="light" className="font-bold">
                {priceLabel ?? "—"}
              </Text>
              <Text variant="body" color="light70" className="mb-xs ml-xs">
                / {PERIOD[selectedPlan]}
              </Text>
            </View>
            {trialAvailable ? (
              <Text variant="body" color="accent" className="mt-xs font-bold">
                {sub?.trialDays ?? 14}-day free trial first
              </Text>
            ) : null}

            <View className="mt-lg gap-sm">
              <PlanRow label="Plan" value={PLAN_LABEL[selectedPlan]} />
              <PlanRow
                label="Billed"
                value={priceLabel ? `${priceLabel} per ${PERIOD[selectedPlan]}` : "—"}
              />
              {trialAvailable ? <PlanRow label="Due today" value="Pay nothing" accent /> : null}
            </View>
          </PremiumSurface>

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
            <SealCheck size={22} color={colors.primaryBright} />
            <Text className="flex-1">{feature}</Text>
          </View>
        ))}
      </View>

      {!isPremium ? (
        <View className="gap-md">
          {offerings.isLoading ? (
            <Button label="Loading plans…" disabled onPress={() => undefined} />
          ) : canTransact ? (
            <>
              <Button
                label={
                  trialAvailable
                    ? "Start free trial"
                    : `Subscribe ${PLAN_LABEL[selectedPlan].toLowerCase()}`
                }
                loading={isWorking}
                disabled={offerings.isLoading || !canTransact}
                onPress={() => buy(selectedPlan, { asTrial: trialAvailable })}
              />
              <Text color="muted" className="text-center">
                {trialAvailable
                  ? "Cancel any time before the trial ends and you won't be charged."
                  : "You'll be charged through your app store account. Cancel any time."}
              </Text>
            </>
          ) : (
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
      ) : null}

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

      <Modal visible={confirmCancelOpen} transparent animationType="fade">
        <ModalShell
          tone="danger"
          title="Cancel your subscription?"
          body={
            billingLive
              ? `We'll take you to your app store subscription settings. You'll keep premium until ${formatDate(sub?.renewsAt ?? sub?.accessEndsAt) || "the end of the period"}.`
              : `You'll keep premium access until ${formatDate(sub?.accessEndsAt) || "the end of your billing period"}. No partial refunds.`
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
                    // Store cancellations finish outside the app, so only the
                    // backend path can honestly claim it is done.
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
          body={`Confirmation sent to your email. Access continues until ${formatDate(sub?.accessEndsAt) || "the end of your billing period"}.`}
        >
          <Button
            label="Back to dashboard"
            variant="secondary"
            onPress={() => {
              setCancelledOpen(false);
              router.replace("/(app)/(tabs)/dashboard");
            }}
          />
        </ModalShell>
      </Modal>
    </Screen>
  );
}
