import * as Network from "expo-network";
import { getItem, removeItem, setItem, storageKeys } from "./storage";

export interface QueuedBarcodeScan {
  barcode: string;
  format: string;
  scannedAt: string;
}

/**
 * Scans queued while offline are stored **per user**.
 *
 * They used to share one device-wide key, which meant a scan queued by one
 * account could be looked up and logged into whichever account happened to be
 * signed in when connectivity returned — one person's food landing in another
 * person's diary on a shared or resold device.
 *
 * Namespacing also beats clearing the queue on sign-out: someone who signs out
 * and back in keeps their own pending scans, while still never seeing anyone
 * else's.
 */
function keyFor(ownerId: string): string {
  return `${storageKeys.offlineBarcodeScans}.${ownerId}`;
}

export async function isNetworkReachable(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function queueBarcodeScan(ownerId: string, scan: QueuedBarcodeScan): Promise<void> {
  const key = keyFor(ownerId);
  const existing = (await getItem<QueuedBarcodeScan[]>(key)) ?? [];
  const next = [scan, ...existing.filter((item) => item.barcode !== scan.barcode)].slice(0, 20);
  await setItem(key, next);
}

export async function readQueuedBarcodeScans(ownerId: string): Promise<QueuedBarcodeScan[]> {
  // Anything left under the old shared key has no recoverable owner, so it
  // cannot be safely attributed to whoever is signed in now. Drop it.
  await removeItem(storageKeys.offlineBarcodeScans);
  return (await getItem<QueuedBarcodeScan[]>(keyFor(ownerId))) ?? [];
}

export async function removeQueuedBarcodeScan(ownerId: string, barcode: string): Promise<void> {
  const key = keyFor(ownerId);
  const existing = (await getItem<QueuedBarcodeScan[]>(key)) ?? [];
  await setItem(
    key,
    existing.filter((item) => item.barcode !== barcode)
  );
}
