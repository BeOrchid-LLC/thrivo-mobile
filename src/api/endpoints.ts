import { z } from "zod";
import { userSessionResponseSchema } from "@beorchid-llc/thrivo-contracts/auth";
import * as c from "@/contracts";

/**
 * The single source of truth for the backend contract (BACKEND_ARCHITECTURE §12),
 * adapted from the pinpoint-admin `endpoints.ts` pattern.
 *
 * Each entry declares an endpoint's `path`, `method`, whether `auth` is enforced,
 * and the Zod schemas for its request `payload` and success `response` (the
 * unwrapped `data`). The API client (`callApi`) is the only consumer: it builds
 * the request from this record and validates the response against `response`.
 *
 * Request/response *types* are inferred from these schemas (see EndpointPayload /
 * EndpointResponse), so the runtime contract and the static types can never drift.
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface EndpointConfig {
  path: string;
  method: HttpMethod;
  /** Attach the `Authorization: Bearer` header. `false` = public route. */
  auth: boolean;
  /** Schema for the request body. Omit for GET/DELETE without a body. */
  payload?: z.ZodTypeAny;
  /** Schema for the success `data` payload. */
  response: z.ZodTypeAny;
}

export const ENDPOINTS = {
  // --- Auth (public) ---
  PASSWORD_SIGNUP: {
    path: "/auth/password/signup",
    method: "POST",
    auth: false,
    payload: c.signUpPayload,
    response: c.authSessionSchema,
  },
  PASSWORD_SIGNIN: {
    path: "/auth/password/signin",
    method: "POST",
    auth: false,
    payload: c.signInPayload,
    response: c.authSessionSchema,
  },
  OAUTH_APPLE: {
    path: "/auth/oauth/apple",
    method: "POST",
    auth: false,
    payload: c.oauthPayload,
    response: c.authSessionSchema,
  },
  OTP_REQUEST: {
    path: "/auth/otp/request",
    method: "POST",
    auth: false,
    payload: c.otpRequestPayload,
    response: c.ackSchema,
  },
  OTP_VERIFY: {
    path: "/auth/otp/verify",
    method: "POST",
    auth: false,
    payload: c.otpVerifyPayload,
    response: c.authSessionSchema,
  },
  LOGOUT: {
    path: "/auth/logout",
    method: "POST",
    auth: true,
    response: c.ackSchema,
  },
  GET_SESSION: {
    path: "/auth/session",
    method: "GET",
    auth: true,
    response: userSessionResponseSchema,
  },

  // --- Push ---
  PUSH_REGISTER: {
    path: "/push/register",
    method: "POST",
    auth: true,
    payload: c.registerPushPayload,
    response: c.ackSchema,
  },

  // --- User ---
  GET_ME: {
    path: "/users/me",
    method: "GET",
    auth: true,
    response: c.userSchema,
  },
  UPDATE_PROFILE: {
    path: "/users/me/profile",
    method: "PATCH",
    auth: true,
    payload: c.updateProfilePayload,
    response: c.userSchema,
  },
  GET_SETTINGS: {
    path: "/users/me/settings",
    method: "GET",
    auth: true,
    response: c.userSettingsSchema,
  },
  UPDATE_SETTINGS: {
    path: "/users/me/settings",
    method: "PATCH",
    auth: true,
    payload: c.updateUserSettingsPayload,
    response: c.userSettingsSchema,
  },

  // --- Foods (free tier) ---
  FOOD_LOOKUP: {
    path: "/foods/lookup",
    method: "GET",
    auth: true,
    response: c.foodLookupResponse,
  },
  FOOD_SEARCH: {
    path: "/foods/search",
    method: "GET",
    auth: true,
    response: c.foodSearchResponse,
  },
  FOOD_CREATE: {
    path: "/foods",
    method: "POST",
    auth: true,
    payload: c.upsertFoodPayload,
    response: c.foodItemResponse,
  },
  FOOD_UPDATE: {
    path: "/foods/:id",
    method: "PATCH",
    auth: true,
    payload: c.upsertFoodPayload,
    response: c.foodItemResponse,
  },
  FOOD_LOG: {
    path: "/foods/log",
    method: "POST",
    auth: true,
    payload: c.logFoodPayload,
    response: c.logMutationResponse,
  },
  FOOD_LOG_UPDATE: {
    path: "/foods/log/:id",
    method: "PATCH",
    auth: true,
    payload: c.updateLogPayload,
    response: c.logMutationResponse,
  },
  FOOD_LOG_DELETE: {
    path: "/foods/log/:id",
    method: "DELETE",
    auth: true,
    response: c.ackSchema,
  },
  FOOD_LOG_HISTORY: {
    path: "/foods/log/history",
    method: "GET",
    auth: true,
    response: c.foodLogHistoryResponse,
  },
  FOOD_LOG_DAY: {
    path: "/foods/log/day",
    method: "GET",
    auth: true,
    response: c.foodLogDayResponse,
  },
  FOOD_FAVORITES_LIST: {
    path: "/foods/favorites",
    method: "GET",
    auth: true,
    response: c.favoritesResponse,
  },
  FOOD_FAVORITE_ADD: {
    path: "/foods/favorites",
    method: "POST",
    auth: true,
    payload: c.addFavoritePayload,
    response: c.favoritesResponse,
  },
  FOOD_FAVORITE_REMOVE: {
    path: "/foods/favorites/:id",
    method: "DELETE",
    auth: true,
    response: c.favoritesResponse,
  },

  // --- Dashboard ---
  DASHBOARD_CALORIES: {
    path: "/dashboard/calories",
    method: "GET",
    auth: true,
    response: c.dashboardCaloriesResponse,
  },
  DASHBOARD_MACROS: {
    path: "/dashboard/macros",
    method: "GET",
    auth: true,
    response: c.dashboardMacrosResponse,
  },
  DASHBOARD_STREAK: {
    path: "/dashboard/streak",
    method: "GET",
    auth: true,
    response: c.dashboardStreakResponse,
  },

  // --- Metrics (premium) ---
  WEIGHT_LIST: {
    path: "/metrics/weight",
    method: "GET",
    auth: true,
    response: c.weightListResponse,
  },
  WEIGHT_ADD: {
    path: "/metrics/weight",
    method: "POST",
    auth: true,
    payload: c.addWeightPayload,
    response: c.weightEntryResponse,
  },
  WEIGHT_DELETE: {
    path: "/metrics/weight/:id",
    method: "DELETE",
    auth: true,
    response: c.ackSchema,
  },
  WATER_GET: {
    path: "/metrics/water",
    method: "GET",
    auth: true,
    response: c.waterResponse,
  },
  WATER_ADD: {
    path: "/metrics/water",
    method: "POST",
    auth: true,
    payload: c.addWaterPayload,
    response: c.waterResponse,
  },

  // --- Check-ins (premium) ---
  CHECKIN_CREATE: {
    path: "/checkins",
    method: "POST",
    auth: true,
    payload: c.createCheckinPayload,
    response: c.checkinResponse,
  },
  CHECKIN_LIST: {
    path: "/checkins",
    method: "GET",
    auth: true,
    response: c.checkinListResponse,
  },

  // --- Subscription ---
  GET_SUBSCRIPTION: {
    path: "/subscriptions/me",
    method: "GET",
    auth: true,
    response: c.subscriptionResponse,
  },
  START_TRIAL: {
    path: "/subscriptions/trial",
    method: "POST",
    auth: true,
    payload: c.startTrialPayload,
    response: c.subscriptionResponse,
  },
  PURCHASE_SUBSCRIPTION: {
    path: "/subscriptions/purchase",
    method: "POST",
    auth: true,
    payload: c.purchaseSubscriptionPayload,
    response: c.subscriptionResponse,
  },
  CANCEL_SUBSCRIPTION: {
    path: "/subscriptions/cancel",
    method: "POST",
    auth: true,
    payload: c.cancelSubscriptionPayload,
    response: c.subscriptionResponse,
  },
} satisfies Record<string, EndpointConfig>;

export type Endpoints = typeof ENDPOINTS;
export type EndpointKey = keyof Endpoints;

/** Inferred request-body type for an endpoint (`undefined` when it has none). */
export type EndpointPayload<K extends EndpointKey> = Endpoints[K] extends {
  payload: infer P extends z.ZodTypeAny;
}
  ? z.infer<P>
  : undefined;

/** Inferred success `data` type for an endpoint. */
export type EndpointResponse<K extends EndpointKey> = z.infer<Endpoints[K]["response"]>;

/** Endpoint keys that require authentication (handy for refresh/skip logic). */
export type AuthedEndpointKey = {
  [K in EndpointKey]: Endpoints[K]["auth"] extends true ? K : never;
}[EndpointKey];
