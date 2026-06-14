import { z } from "zod";

/**
 * Shared primitives + response envelopes mirroring the backend contract
 * (BACKEND_ARCHITECTURE §3): success `{ data, meta }`, error
 * `{ error: { code, message, details? } }`.
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

/** Wraps a data schema in the standard success envelope. */
export const successEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data, meta: metaSchema.optional() });

export const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelope>;

/** Generic `{ success: boolean }` ack used by logout / delete-style routes. */
export const ackSchema = z.object({ success: z.boolean() });
export type Ack = z.infer<typeof ackSchema>;
