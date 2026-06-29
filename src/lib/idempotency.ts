import * as Crypto from "expo-crypto";

/**
 * Mint a key once per logical write, at enqueue time, and carry it on the request
 * (and on the persisted offline mutation). The backend dedupes on it, so a safe
 * retry or an offline replay after reconnect lands exactly one row — never a
 * duplicate meal/weight/water entry.
 */
export function newIdempotencyKey(): string {
  return Crypto.randomUUID();
}
