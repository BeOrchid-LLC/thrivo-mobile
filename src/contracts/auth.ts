import { z } from "zod";
import { userSchema } from "./user";

/**
 * Auth contracts (ADR-0017): email+password · Google · Apple · email-OTP.
 * Every successful auth route returns a session token + the user.
 *
 * GET /auth/session schemas live in `@beorchid-llc/thrivo-contracts/auth` (0.5.1+).
 */

export const authSessionSchema = z.object({
  token: z.string().min(1),
  /** Seconds until expiry, if the backend communicates it. */
  expiresIn: z.number().optional(),
  user: userSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const signUpPayload = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).optional(),
});
export type SignUpPayload = z.infer<typeof signUpPayload>;

export const signInPayload = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignInPayload = z.infer<typeof signInPayload>;

/** OAuth: the native provider returns an identity token the backend verifies. */
export const oauthPayload = z.object({
  idToken: z.string().min(1),
  /** Apple only supplies name on first authorization. */
  name: z.string().optional(),
});
export type OAuthPayload = z.infer<typeof oauthPayload>;

export const otpRequestPayload = z.object({ email: emailSchema });
export type OtpRequestPayload = z.infer<typeof otpRequestPayload>;

export const otpVerifyPayload = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type OtpVerifyPayload = z.infer<typeof otpVerifyPayload>;
