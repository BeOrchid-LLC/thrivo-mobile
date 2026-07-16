import { callApi } from "@/api/client";
import { localDay } from "@/utils";
import type {
  AddFavoritePayload,
  AddWaterPayload,
  ChartPeriod,
  EstimateFoodPayload,
  LogEstimatePayload,
  LogFoodPayload,
  UpdateLogPayload,
  UpdateWaterPayload,
  UpsertFoodPayload,
} from "@/contracts";

export const lookupFood = (barcode: string) => callApi("FOOD_LOOKUP", { query: { barcode } });

export const searchFoods = (q: string) => callApi("FOOD_SEARCH", { query: { q } });

export const getFoodDetail = async (id: string) =>
  (await callApi("FOOD_DETAIL", { params: { id } })).food;

export const createFood = (payload: UpsertFoodPayload) => callApi("FOOD_CREATE", { payload });

export const updateFood = (id: string, payload: UpsertFoodPayload) =>
  callApi("FOOD_UPDATE", { params: { id }, payload });

export const logFood = (payload: LogFoodPayload, idempotencyKey?: string) =>
  callApi("FOOD_LOG", { payload, idempotencyKey });

export const updateFoodLog = (id: string, payload: UpdateLogPayload) =>
  callApi("FOOD_LOG_UPDATE", { params: { id }, payload });

export const deleteFoodLog = (id: string) => callApi("FOOD_LOG_DELETE", { params: { id } });

export const getFoodLogDay = (day = localDay()) =>
  callApi("FOOD_LOG_DAY", { query: { date: day, today: localDay() } });

export const getRecentFoods = () => callApi("FOOD_RECENT");

export const getFavorites = () => callApi("FOOD_FAVORITES_LIST");

export const addFavorite = (payload: AddFavoritePayload) =>
  callApi("FOOD_FAVORITE_ADD", { payload });

export const removeFavorite = (id: string) => callApi("FOOD_FAVORITE_REMOVE", { params: { id } });

export const estimateFood = (payload: EstimateFoodPayload) => callApi("FOOD_ESTIMATE", { payload });

export const logEstimate = (payload: LogEstimatePayload, idempotencyKey?: string) =>
  callApi("FOOD_LOG_ESTIMATE", { payload, idempotencyKey });

export const getWater = async (day = localDay()) =>
  (await callApi("WATER_GET", { query: { date: day } })).water;

export const getWaterHistory = async (period: ChartPeriod, day = localDay()) =>
  (await callApi("WATER_HISTORY", { query: { date: day, period, today: localDay() } })).history;

export const addWater = (amountMl: number, day = localDay(), idempotencyKey?: string) =>
  callApi("WATER_ADD", { payload: { day, amountMl } satisfies AddWaterPayload, idempotencyKey });

export const updateWater = (id: string, payload: UpdateWaterPayload) =>
  callApi("WATER_UPDATE", { params: { id }, payload });

export const deleteWater = (id: string) => callApi("WATER_DELETE", { params: { id } });
