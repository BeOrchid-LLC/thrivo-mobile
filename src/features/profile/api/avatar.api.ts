import { callApi } from "@/api";
import type { ImageExtension, UploadIntent } from "@/contracts";

/** Default client-side cap (bytes) when a caller doesn't pass one. Mirrors the backend default. */
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Thrown when the picked file is larger than the allowed limit, before/instead of uploading. */
export class FileTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super("FILE_TOO_LARGE");
    this.name = "FileTooLargeError";
  }
}

/** Human-readable MB label for limit messages, e.g. 1048576 → "1 MB". */
export function formatBytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/** Map a picker mime-type to the extension the upload contract accepts. */
export function mimeToExtension(mimeType: string | undefined): ImageExtension {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

interface UploadImageOptions {
  intent: UploadIntent;
  /**
   * Client-side max size in bytes. Defaults to {@link DEFAULT_MAX_UPLOAD_BYTES}.
   * The effective limit is the smaller of this and the server's per-intent cap,
   * so callers can tighten but never loosen the server's authority.
   */
  maxBytes?: number;
}

/**
 * Presigned direct-to-R2 image upload with a variable size limit. Keeps all
 * network I/O in the api layer (MOBILE_ARCHITECTURE §6): validate size → request
 * a presigned PUT URL → upload the bytes straight to R2 (NOT through our API) →
 * have the backend verify the object landed. Returns the public URL to attach.
 *
 * Size is checked client-side here for instant feedback (no wasted upload); the
 * backend re-checks the same limit on verify, so it can't be bypassed.
 */
export async function uploadImage(
  asset: { uri: string; mimeType?: string; fileSize?: number },
  { intent, maxBytes = DEFAULT_MAX_UPLOAD_BYTES }: UploadImageOptions
): Promise<string> {
  // Early reject when the picker already told us the size — avoids the round trip.
  if (asset.fileSize !== undefined && asset.fileSize > maxBytes) {
    throw new FileTooLargeError(maxBytes);
  }

  const fileExtension = mimeToExtension(asset.mimeType);
  const presigned = await callApi("UPLOAD_PRESIGNED_URL", {
    payload: { intent, fileExtension },
  });

  // The server's per-intent cap is authoritative; never exceed it even if the
  // caller passed a larger number.
  const effectiveMax = Math.min(maxBytes, presigned.maxBytes);

  const file = await fetch(asset.uri);
  const blob = await file.blob();
  if (blob.size > effectiveMax) {
    throw new FileTooLargeError(effectiveMax);
  }

  // The Content-Type MUST match what the URL was signed with, or R2 rejects the PUT.
  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presigned.contentType },
    body: blob,
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  await callApi("UPLOAD_VERIFY", { params: { id: presigned.uploadId } });

  return presigned.publicUrl;
}
