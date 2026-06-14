import { callApi } from "@/api";
import type { OtpRequestPayload, OtpVerifyPayload, SignInPayload } from "@/contracts";

/**
 * Auth intent functions — thin wrappers over the typed client (one per backend
 * action). Hooks consume these; screens never call the client directly
 * (MOBILE_ARCHITECTURE §6).
 */
export const signInWithPassword = (payload: SignInPayload) =>
  callApi("PASSWORD_SIGNIN", { payload });

export const requestOtp = (payload: OtpRequestPayload) => callApi("OTP_REQUEST", { payload });

export const verifyOtp = (payload: OtpVerifyPayload) => callApi("OTP_VERIFY", { payload });

export const logout = () => callApi("LOGOUT");
