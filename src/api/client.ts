import { successEnvelope } from "@/contracts";
import { env } from "@/config/env";
import {
  ENDPOINTS,
  type EndpointKey,
  type EndpointPayload,
  type EndpointResponse,
} from "./endpoints";
import { apiErrorFromResponse, networkError, parseError } from "./errors";
import { getAuthToken, handleUnauthenticated, refreshAuthToken } from "./auth-token";

type QueryValue = string | number | boolean | null | undefined;

interface BaseOptions {
  /** Values substituted into `:name` path segments (IDs only — §5). */
  params?: Record<string, string | number>;
  /** Appended as a querystring; null/undefined values are dropped. */
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Sent as the `Idempotency-Key` header so the backend dedupes safe retries
   *  and offline replays — one row per key. Minted once at enqueue time. */
  idempotencyKey?: string;
}

/** Options shape: `payload` is required iff the endpoint declares one. */
export type CallOptions<K extends EndpointKey> =
  EndpointPayload<K> extends undefined
    ? BaseOptions & { payload?: undefined }
    : BaseOptions & { payload: EndpointPayload<K> };

function buildPath(
  template: string,
  params: Record<string, string | number> | undefined,
  query: Record<string, QueryValue> | undefined
): string {
  const path = template.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw parseError(`Missing path param "${name}" for "${template}"`);
    }
    return encodeURIComponent(String(value));
  });

  if (!query) return path;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}

/**
 * The single typed entrypoint for backend calls (MOBILE_ARCHITECTURE §6). Looks
 * up the endpoint config, builds + sends the request, injects the auth header,
 * Zod-validates the response against the contract, and returns the unwrapped
 * `data`. Throws `ApiError` on any failure (idiomatic for TanStack Query).
 *
 * No other module performs network I/O.
 */
export async function callApi<K extends EndpointKey>(
  endpoint: K,
  options: CallOptions<K> = {} as CallOptions<K>
): Promise<EndpointResponse<K>> {
  const config = ENDPOINTS[endpoint];
  const path = buildPath(config.path, options.params, options.query);
  const url = `${env.apiUrl}${env.apiPrefix}${path}`;

  const body = options.payload !== undefined ? JSON.stringify(options.payload) : undefined;

  const send = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.payload !== undefined) headers["Content-Type"] = "application/json";
    if (config.auth && token) headers.Authorization = `Bearer ${token}`;
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
    return fetch(url, { method: config.method, headers, body, signal: options.signal });
  };

  let response: Response;
  try {
    response = await send(config.auth ? await getAuthToken() : null);
    // On a 401 for an authed call, rotate the refresh token once and retry —
    // so a routinely-expired 15-minute access token never logs the user out.
    if (response.status === 401 && config.auth) {
      const refreshed = await refreshAuthToken();
      if (refreshed) response = await send(refreshed);
    }
  } catch (cause) {
    throw networkError(cause instanceof Error ? cause.message : "Network request failed");
  }

  // Some success responses (e.g. 204) carry no body.
  const text = await response.text();
  const bodyData: unknown = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    if (response.status === 401) handleUnauthenticated();
    throw apiErrorFromResponse(response.status, bodyData);
  }

  const parsed = successEnvelope(config.response).safeParse(bodyData);
  if (!parsed.success) {
    throw parseError(`Response for "${endpoint}" did not match its contract`, parsed.error.issues);
  }
  return parsed.data.data as EndpointResponse<K>;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw parseError("Response was not valid JSON");
  }
}
