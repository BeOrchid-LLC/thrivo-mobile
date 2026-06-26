import { z } from "zod";
import { isoDateSchema } from "./common";

export const entitlementSchema = z.enum(["free", "premium"]);
export type Entitlement = z.infer<typeof entitlementSchema>;

export const subscriptionPlanSchema = z.enum(["monthly", "annual"]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "canceled",
  "expired",
  "none",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionPlanInfoSchema = z.object({
  plan: subscriptionPlanSchema,
  productId: z.string(),
  priceLabel: z.string(),
  billingPeriodLabel: z.string(),
});
export type SubscriptionPlanInfo = z.infer<typeof subscriptionPlanInfoSchema>;

/** Entitlement + exact billing info for the manage/cancel screen. */
export const subscriptionSchema = z.object({
  entitlement: entitlementSchema,
  status: subscriptionStatusSchema,
  plan: subscriptionPlanSchema.nullable(),
  productId: z.string().nullable(),
  priceLabel: z.string().nullable(),
  renewsAt: isoDateSchema.nullable(),
  accessEndsAt: isoDateSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  trialUsed: z.boolean(),
  trialDays: z.number().int(),
  plans: z.array(subscriptionPlanInfoSchema),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionResponse = z.object({ subscription: subscriptionSchema });
export type SubscriptionResponse = z.infer<typeof subscriptionResponse>;

export const startTrialPayload = z.object({
  plan: subscriptionPlanSchema.default("monthly"),
});
export type StartTrialPayload = z.infer<typeof startTrialPayload>;

export const purchaseSubscriptionPayload = z.object({
  plan: subscriptionPlanSchema,
});
export type PurchaseSubscriptionPayload = z.infer<typeof purchaseSubscriptionPayload>;

export const cancelSubscriptionPayload = z.object({
  reason: z.string().optional(),
});
export type CancelSubscriptionPayload = z.infer<typeof cancelSubscriptionPayload>;
