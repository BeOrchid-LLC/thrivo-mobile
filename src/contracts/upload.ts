import { z } from "zod";

/**
 * Local mirror of the backend uploads contract (@beorchid-llc/thrivo-contracts
 * `./uploads`, v0.8.0). Stays here until the mobile app consumes that surface
 * from the published package. Drives the presigned direct-to-R2 upload flow.
 */
export const uploadIntentSchema = z.enum(["avatar", "progress_photo", "meal_photo"]);
export type UploadIntent = z.infer<typeof uploadIntentSchema>;

export const uploadStatusSchema = z.enum(["pending", "uploaded", "verified", "failed", "expired"]);
export type UploadStatus = z.infer<typeof uploadStatusSchema>;

export const imageExtensionSchema = z.enum(["jpg", "jpeg", "png", "webp", "heic"]);
export type ImageExtension = z.infer<typeof imageExtensionSchema>;

export const requestUploadPayload = z.object({
  intent: uploadIntentSchema,
  fileExtension: imageExtensionSchema,
});
export type RequestUploadPayload = z.infer<typeof requestUploadPayload>;

export const requestUploadResult = z.object({
  uploadId: z.string().uuid(),
  uploadUrl: z.string().url(),
  contentType: z.string(),
  key: z.string(),
  publicUrl: z.string().url(),
  /** Server-owned byte cap for this intent; client should reject larger files. */
  maxBytes: z.number().int().positive(),
  expiresAt: z.coerce.date(),
});
export type RequestUploadResult = z.infer<typeof requestUploadResult>;

export const verifyUploadResult = z.object({
  uploadId: z.string().uuid(),
  status: uploadStatusSchema,
  publicUrl: z.string().url(),
  size: z.number().int().nullable(),
});
export type VerifyUploadResult = z.infer<typeof verifyUploadResult>;
