import { z } from "zod";
import { isoDateSchema } from "./common";

export const entitlementSchema = z.enum(["free", "premium"]);
export type Entitlement = z.infer<typeof entitlementSchema>;

export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "canceled",
  "expired",
  "none",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** Entitlement + exact billing info for the manage/cancel screen. */
export const subscriptionSchema = z.object({
  entitlement: entitlementSchema,
  status: subscriptionStatusSchema,
  priceLabel: z.string().nullable(),
  renewsAt: isoDateSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionResponse = z.object({ subscription: subscriptionSchema });
export type SubscriptionResponse = z.infer<typeof subscriptionResponse>;
