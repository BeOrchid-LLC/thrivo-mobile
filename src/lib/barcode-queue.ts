import * as Network from "expo-network";
import { getItem, setItem, storageKeys } from "./storage";

export interface QueuedBarcodeScan {
  barcode: string;
  format: string;
  scannedAt: string;
}

export async function isNetworkReachable(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function queueBarcodeScan(scan: QueuedBarcodeScan): Promise<void> {
  const existing = (await getItem<QueuedBarcodeScan[]>(storageKeys.offlineBarcodeScans)) ?? [];
  const next = [scan, ...existing.filter((item) => item.barcode !== scan.barcode)].slice(0, 20);
  await setItem(storageKeys.offlineBarcodeScans, next);
}

export async function readQueuedBarcodeScans(): Promise<QueuedBarcodeScan[]> {
  return (await getItem<QueuedBarcodeScan[]>(storageKeys.offlineBarcodeScans)) ?? [];
}

export async function removeQueuedBarcodeScan(barcode: string): Promise<void> {
  const existing = (await getItem<QueuedBarcodeScan[]>(storageKeys.offlineBarcodeScans)) ?? [];
  await setItem(
    storageKeys.offlineBarcodeScans,
    existing.filter((item) => item.barcode !== barcode)
  );
}
