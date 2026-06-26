import { callApi } from "@/api";
import type { UpdateUserSettingsPayload } from "@/contracts";

export const getSettings = () => callApi("GET_SETTINGS");

export const updateSettings = (payload: UpdateUserSettingsPayload) =>
  callApi("UPDATE_SETTINGS", { payload });
