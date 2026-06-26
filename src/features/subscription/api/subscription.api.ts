import { callApi } from "@/api";
import type {
  CancelSubscriptionPayload,
  PurchaseSubscriptionPayload,
  StartTrialPayload,
} from "@/contracts";

export const getSubscription = () => callApi("GET_SUBSCRIPTION");

export const startTrial = (payload: StartTrialPayload) => callApi("START_TRIAL", { payload });

export const purchaseSubscription = (payload: PurchaseSubscriptionPayload) =>
  callApi("PURCHASE_SUBSCRIPTION", { payload });

export const cancelSubscription = (payload: CancelSubscriptionPayload = {}) =>
  callApi("CANCEL_SUBSCRIPTION", { payload });
