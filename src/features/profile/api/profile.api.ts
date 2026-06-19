import { callApi } from "@/api";
import type { UpdateProfilePayload } from "@/contracts";

export const getMe = () => callApi("GET_ME");

export const updateProfile = (payload: UpdateProfilePayload) =>
  callApi("UPDATE_PROFILE", { payload });
