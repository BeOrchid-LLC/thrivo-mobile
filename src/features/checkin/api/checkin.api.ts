import { callApi } from "@/api";
import type { CreateCheckinPayload } from "@/contracts";

export const createCheckin = (payload: CreateCheckinPayload) =>
  callApi("CHECKIN_CREATE", { payload });

export const getCheckins = () => callApi("CHECKIN_LIST");
