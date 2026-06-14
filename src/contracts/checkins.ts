import { z } from "zod";
import { idSchema, isoDateSchema, localDaySchema } from "./common";

export const moodSchema = z.enum(["great", "good", "okay", "low", "bad"]);
export type Mood = z.infer<typeof moodSchema>;

export const checkinSchema = z.object({
  id: idSchema,
  mood: moodSchema,
  day: localDaySchema,
  note: z.string().nullable(),
  /** Server-generated "Thrivo Tip" returned for the chosen mood. */
  tip: z.string().nullable(),
  createdAt: isoDateSchema,
});
export type Checkin = z.infer<typeof checkinSchema>;

export const createCheckinPayload = z.object({
  mood: moodSchema,
  day: localDaySchema,
  note: z.string().max(500).optional(),
});
export type CreateCheckinPayload = z.infer<typeof createCheckinPayload>;

export const checkinResponse = z.object({ checkin: checkinSchema });
export type CheckinResponse = z.infer<typeof checkinResponse>;

export const checkinListResponse = z.object({ checkins: z.array(checkinSchema) });
export type CheckinListResponse = z.infer<typeof checkinListResponse>;
