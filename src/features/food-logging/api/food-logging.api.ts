import { callApi } from "@/api";
import { localDay } from "@/utils";
import type {
  AddFavoritePayload,
  AddWaterPayload,
  EstimateFoodPayload,
  LogEstimatePayload,
  LogFoodPayload,
  UpdateLogPayload,
  UpsertFoodPayload,
} from "@/contracts";

export const lookupFood = (barcode: string) => callApi("FOOD_LOOKUP", { query: { barcode } });

export const searchFoods = (q: string) => callApi("FOOD_SEARCH", { query: { q } });

export const getFoodDetail = (id: string) => callApi("FOOD_DETAIL", { params: { id } });

export const createFood = (payload: UpsertFoodPayload) => callApi("FOOD_CREATE", { payload });

export const updateFood = (id: string, payload: UpsertFoodPayload) =>
  callApi("FOOD_UPDATE", { params: { id }, payload });

export const logFood = (payload: LogFoodPayload, idempotencyKey?: string) =>
  callApi("FOOD_LOG", { payload, idempotencyKey });

export const updateFoodLog = (id: string, payload: UpdateLogPayload) =>
  callApi("FOOD_LOG_UPDATE", { params: { id }, payload });

export const deleteFoodLog = (id: string) => callApi("FOOD_LOG_DELETE", { params: { id } });

export const getFoodLogDay = (day = localDay()) =>
  callApi("FOOD_LOG_DAY", { query: { date: day } });

export const getRecentFoods = () => callApi("FOOD_RECENT");

export const getFavorites = () => callApi("FOOD_FAVORITES_LIST");

export const addFavorite = (payload: AddFavoritePayload) =>
  callApi("FOOD_FAVORITE_ADD", { payload });

export const removeFavorite = (id: string) => callApi("FOOD_FAVORITE_REMOVE", { params: { id } });

export const estimateFood = (payload: EstimateFoodPayload) => callApi("FOOD_ESTIMATE", { payload });

export const logEstimate = (payload: LogEstimatePayload, idempotencyKey?: string) =>
  callApi("FOOD_LOG_ESTIMATE", { payload, idempotencyKey });

export const getWater = (day = localDay()) => callApi("WATER_GET", { query: { date: day } });

export const addWater = (amountMl: number, day = localDay(), idempotencyKey?: string) =>
  callApi("WATER_ADD", { payload: { day, amountMl } satisfies AddWaterPayload, idempotencyKey });

export const deleteWater = (id: string) => callApi("WATER_DELETE", { params: { id } });
