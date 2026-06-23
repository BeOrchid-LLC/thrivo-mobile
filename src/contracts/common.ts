import { z } from "zod";

/**
 * Shared primitives + response envelopes mirroring the v0.5.0 backend contract:
 * success `{ success: true, data, responseCode, message }`,
 * error  `{ success: false, error: { code, message, details? }, responseCode, message }`.
 */

export const idSchema = z.string().min(1);
/** ISO-8601 timestamp string. */
export const isoDateSchema = z.string();
/** Local calendar day, `YYYY-MM-DD`. */
export const localDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const metaSchema = z
  .object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    total: z.number().optional(),
    nextCursor: z.string().nullish(),
  })
  .passthrough();
export type Meta = z.infer<typeof metaSchema>;

/** Wraps a data schema in the standard v0.5.0 success envelope. */
export const successEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    responseCode: z.number(),
    message: z.string(),
  });

export const errorEnvelope = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  responseCode: z.number(),
  message: z.string(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelope>;

/** Ack endpoints return `data: null` — meaning is carried by `success: true` + `message`. */
export const ackSchema = z.null();
export type Ack = null;
