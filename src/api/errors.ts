import { errorEnvelope } from "@/contracts";

/**
 * Canonical client-side error codes. Backend `{ error: { code } }` values map
 * onto these; feature hooks branch on `code` for UX (e.g. RATE_LIMITED → retry
 * copy, UNAUTHENTICATED → route to (auth)). MOBILE_ARCHITECTURE §6.
 */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK" // request never completed (offline / DNS / reset)
  | "TIMEOUT"
  | "PARSE_ERROR" // response shape did not match the Zod contract
  | "UNKNOWN";

/** Map an HTTP status to a fallback code when the body carries no usable code. */
const statusToCode = (status: number): ApiErrorCode => {
  switch (true) {
    case status === 401:
      return "UNAUTHENTICATED";
    case status === 403:
      return "FORBIDDEN";
    case status === 404:
      return "NOT_FOUND";
    case status === 409:
      return "CONFLICT";
    case status === 422:
      return "VALIDATION";
    case status === 429:
      return "RATE_LIMITED";
    case status >= 500:
      return "SERVER_ERROR";
    default:
      return "UNKNOWN";
  }
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status, or 0 for client-side (network/parse) failures. */
  readonly status: number;
  readonly details?: unknown;

  constructor(args: { code: ApiErrorCode; message: string; status: number; details?: unknown }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }

  get isAuthError(): boolean {
    return this.code === "UNAUTHENTICATED";
  }
}

/** Backend codes we surface verbatim; anything else falls back to the status map. */
const KNOWN_BACKEND_CODES = new Set<string>([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMITED",
  "SERVER_ERROR",
]);

/** Build an ApiError from an HTTP error response body + status. */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const parsed = errorEnvelope.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    // Trust a recognized backend code; otherwise fall back to the status map.
    const known = KNOWN_BACKEND_CODES.has(code) ? (code as ApiErrorCode) : statusToCode(status);
    return new ApiError({
      code: known,
      message,
      status,
      details: details ?? { backendCode: code },
    });
  }
  return new ApiError({
    code: statusToCode(status),
    message: `Request failed with status ${status}`,
    status,
  });
}

export const networkError = (message = "Network request failed"): ApiError =>
  new ApiError({ code: "NETWORK", message, status: 0 });

export const parseError = (message: string, details?: unknown): ApiError =>
  new ApiError({ code: "PARSE_ERROR", message, status: 0, details });

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
