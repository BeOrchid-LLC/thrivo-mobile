import { z } from "zod";

export const platformSchema = z.enum(["ios", "android"]);
export type Platform = z.infer<typeof platformSchema>;

export const registerPushPayload = z.object({
  expoPushToken: z.string().min(1),
  platform: platformSchema,
  /** Preferred local time for the daily nudge, `HH:mm`. */
  notifyAt: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});
export type RegisterPushPayload = z.infer<typeof registerPushPayload>;
