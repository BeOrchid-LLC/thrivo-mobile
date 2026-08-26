import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Button, CenterModal } from "@/components";
import { useMe } from "@/features/profile";
import { isBillingConfigured } from "@/lib";
import { formatLongDate } from "@/utils";
import { useCancelSubscription } from "../hooks/useCancelSubscription";

/** How long the "cancelled" dialog waits before returning to the dashboard. */
const DISMISS_AFTER_MS = 30000;

export interface CancelSubscriptionDialogsProps {
  /** Whether the confirmation dialog is open. The success dialog follows on its own. */
  visible: boolean;
  onClose: () => void;
  /** Last day of paid access, and the next renewal date. */
  accessEndsAt?: string | null;
  renewsAt?: string | null;
}

/**
 * The two-step cancel flow: confirm, then acknowledge.
 *
 * It lives here rather than in either screen because both the settings card and
 * the subscription screen offer cancelling, and a confirmation dialog that says
 * something different depending on which button opened it is a bug waiting to
 * happen.
 *
 * With billing configured the cancel itself happens in the store, so the second
 * dialog only appears on the backend path — see `useCancelSubscription`.
 */
export function CancelSubscriptionDialogs({
  visible,
  onClose,
  accessEndsAt,
  renewsAt,
}: CancelSubscriptionDialogsProps) {
  const cancel = useCancelSubscription();
  const email = useMe().data?.email;
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const billingLive = isBillingConfigured();
  const accessUntil = formatLongDate(accessEndsAt) || "the end of your billing period";

  useEffect(() => {
    if (!cancelledOpen) return undefined;
    const timeout = setTimeout(() => {
      setCancelledOpen(false);
      router.replace("/(app)/(tabs)/dashboard");
    }, DISMISS_AFTER_MS);
    return () => clearTimeout(timeout);
  }, [cancelledOpen]);

  return (
    <>
      <CenterModal
        visible={visible}
        tone="danger"
        title="Cancel your subscription?"
        body={
          billingLive
            ? `We'll take you to your app store subscription settings. You'll keep premium until ${formatLongDate(renewsAt ?? accessEndsAt) || "the end of the period"}.`
            : `You'll keep premium access until ${accessUntil}. No partial refunds.`
        }
      >
        <Button label="Keep premium" onPress={onClose} />
        <Button
          label={billingLive ? "Manage in app store" : "Cancel my subscription"}
          variant="danger"
          loading={cancel.isPending}
          onPress={() =>
            cancel.mutate(
              {},
              {
                onSuccess: (result) => {
                  onClose();
                  // Store cancellations finish outside the app, so only the
                  // backend path can honestly claim it is done.
                  if (!result.openedStore) setCancelledOpen(true);
                },
              }
            )
          }
        />
      </CenterModal>

      <CenterModal
        visible={cancelledOpen}
        tone="success"
        title="Subscription cancelled"
        body={`Confirmation sent to ${email || "your email"}. Access continues until ${accessUntil}.`}
      >
        <Button
          label="Back to dashboard"
          variant="secondary"
          onPress={() => {
            setCancelledOpen(false);
            router.replace("/(app)/(tabs)/dashboard");
          }}
        />
      </CenterModal>
    </>
  );
}
