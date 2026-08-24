import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  queueBarcodeScan,
  readQueuedBarcodeScans,
  removeQueuedBarcodeScan,
} from "../barcode-queue";
import { clearUserScopedStorage, storageKeys } from "../storage";

/**
 * The offline queue holds one person's food before it reaches the server. It
 * previously lived under a single device-wide key, so a scan queued by one
 * account could be logged into whichever account was signed in when
 * connectivity returned. These pin the isolation.
 */

const scan = (barcode: string) => ({
  barcode,
  format: "EAN13",
  scannedAt: "2026-08-22T10:00:00.000Z",
});

describe("offline barcode queue", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("keeps each user's queue to themselves", async () => {
    await queueBarcodeScan("user-a", scan("1111111111111"));
    await queueBarcodeScan("user-b", scan("2222222222222"));

    expect((await readQueuedBarcodeScans("user-a")).map((s) => s.barcode)).toEqual([
      "1111111111111",
    ]);
    expect((await readQueuedBarcodeScans("user-b")).map((s) => s.barcode)).toEqual([
      "2222222222222",
    ]);
  });

  it("returns nothing for a user who has queued nothing, even when others have", async () => {
    await queueBarcodeScan("user-a", scan("1111111111111"));

    expect(await readQueuedBarcodeScans("user-b")).toEqual([]);
  });

  it("survives sign-out and back in for the same user", async () => {
    // The reason for namespacing rather than clearing on sign-out.
    await queueBarcodeScan("user-a", scan("1111111111111"));

    expect(await readQueuedBarcodeScans("user-a")).toHaveLength(1);
  });

  it("removes a scan only from its owner's queue", async () => {
    await queueBarcodeScan("user-a", scan("1111111111111"));
    await queueBarcodeScan("user-b", scan("1111111111111"));

    await removeQueuedBarcodeScan("user-a", "1111111111111");

    expect(await readQueuedBarcodeScans("user-a")).toEqual([]);
    expect(await readQueuedBarcodeScans("user-b")).toHaveLength(1);
  });

  it("discards a legacy unowned queue rather than attributing it to whoever reads next", async () => {
    await AsyncStorage.setItem(
      storageKeys.offlineBarcodeScans,
      JSON.stringify([scan("9999999999999")])
    );

    expect(await readQueuedBarcodeScans("user-a")).toEqual([]);
    expect(await AsyncStorage.getItem(storageKeys.offlineBarcodeScans)).toBeNull();
  });

  it("is wiped for every user when the device is purged on account deletion", async () => {
    await queueBarcodeScan("user-a", scan("1111111111111"));
    await queueBarcodeScan("user-b", scan("2222222222222"));

    await clearUserScopedStorage();

    expect(await readQueuedBarcodeScans("user-a")).toEqual([]);
    expect(await readQueuedBarcodeScans("user-b")).toEqual([]);
  });

  it("caps a single user's queue at 20 and de-duplicates by barcode", async () => {
    for (let i = 0; i < 25; i += 1) {
      await queueBarcodeScan("user-a", scan(`barcode-${i}`));
    }
    await queueBarcodeScan("user-a", scan("barcode-24"));

    const queued = await readQueuedBarcodeScans("user-a");
    expect(queued).toHaveLength(20);
    expect(queued.filter((s) => s.barcode === "barcode-24")).toHaveLength(1);
  });
});
