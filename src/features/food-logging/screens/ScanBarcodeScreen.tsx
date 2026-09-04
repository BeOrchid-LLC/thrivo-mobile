import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";
import { Barcode } from "phosphor-react-native";
import { Button, Card, Input, PageHeader, Screen, SectionError, Text } from "@/components";
import {
  analytics,
  isNetworkReachable,
  queueBarcodeScan,
  readQueuedBarcodeScans,
  removeQueuedBarcodeScan,
} from "@/lib";
import { useUserId } from "@/stores";
import { colors } from "@/theme";
import type { FoodItem } from "@/contracts";
import { FoodResultRow } from "../components/FoodResultRow";
import { LogItemSheet } from "../components/LogItemSheet";
import { ScanFrame } from "../components/ScanFrame";
import { useBarcodeLookup } from "../hooks/useFoodLogging";

function normalizeBarcode(value: string): string | null {
  const normalized = value.replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(normalized) ? normalized : null;
}

const barcodeTypes: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e", "code128"];
// Hoisted: passing fresh object literals reconfigures the native camera on
// every render of this screen, and the screen re-renders on every lookup state
// change and every keystroke in the dev barcode field.
const cameraStyle = { flex: 1 } as const;
const barcodeScannerSettings = { barcodeTypes };

export interface ScanBarcodeScreenProps {
  day: string;
  onBack: () => void;
}

/**
 * Barcode capture + lookup. Pushed over the tab bar rather than rendered inside
 * the Log tab, so the camera frame owns the page and a stray tab tap cannot
 * interrupt a scan.
 */
export function ScanBarcodeScreen({ day, onBack }: ScanBarcodeScreenProps) {
  const [barcode, setBarcode] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  // The offline queue is per user, so scans can never replay into another
  // account on a shared device.
  const ownerId = useUserId();
  const [message, setMessage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loggingItem, setLoggingItem] = useState<FoodItem | null>(null);
  const lookupBarcode = normalizeBarcode(barcode);
  const lookup = useBarcodeLookup(lookupBarcode);
  const food = lookup.data?.food;
  const lastScanRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const online = await isNetworkReachable();
      if (!active || !online || barcode) return;
      const [queued] = ownerId ? await readQueuedBarcodeScans(ownerId) : [];
      if (!active || !queued) return;
      const normalized = normalizeBarcode(queued.barcode);
      if (!normalized) return;
      setBarcode(normalized);
      setFormat(queued.format);
      setMessage("Replaying an offline scan.");
    })();
    return () => {
      active = false;
    };
    // `ownerId` is part of the dependency list on purpose: it arrives from the
    // session store only after Clerk restores and GET /users/me resolves, so on
    // a cold start into this screen the first run sees `null` and finds nothing
    // to replay. Without re-running when it lands, a scan queued offline would
    // sit in storage forever with no visible failure.
  }, [barcode, ownerId]);

  useEffect(() => {
    if (food && lookupBarcode) {
      if (ownerId) void removeQueuedBarcodeScan(ownerId, lookupBarcode);
    }
    // Same reason as above — a lookup that resolves before the session id does
    // would leave the scan queued and replay it again on the next visit.
  }, [food, lookupBarcode, ownerId]);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const value = result.raw ?? result.data;
      if (!value) return;
      const normalized = normalizeBarcode(value);
      if (!normalized) {
        setMessage("That barcode format is not supported. Try another packaged food.");
        return;
      }
      if (lastScanRef.current === normalized) return;
      lastScanRef.current = normalized;
      setScanned(true);
      setBarcode(normalized);
      setFormat(result.type);
      setMessage("Barcode captured. Looking up nutrition...");
      // A decoded barcode, not a lookup result — the funnel step is the scan
      // itself. The `lastScanRef` guard above keeps a steady camera to one event.
      analytics.track("thrivo.barcode_scanned", { format: result.type });
      void (async () => {
        const online = await isNetworkReachable();
        if (!online) {
          if (ownerId) {
            await queueBarcodeScan(ownerId, {
              barcode: normalized,
              format: result.type,
              scannedAt: new Date().toISOString(),
            });
          }
          setMessage("You are offline. The decoded barcode was saved for lookup later.");
        }
      })();
      // Only `ownerId` is closed over; the setters and the ref are stable. Kept
      // referentially stable so `CameraView` is not handed a new scan callback on
      // every render of the screen.
    },
    [ownerId]
  );

  return (
    <Screen
      scroll
      rhythm="default"
      header={
        <PageHeader
          title="Scan Barcode"
          subtitle="Packaged foods - instant nutrition look up."
          onBack={onBack}
        />
      }
    >
      <ScanFrame scanning={Boolean(permission?.granted) && !scanned}>
        {permission?.granted ? (
          <CameraView
            style={cameraStyle}
            facing="back"
            barcodeScannerSettings={barcodeScannerSettings}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        ) : (
          <View className="flex-1 items-center justify-center gap-sm p-lg">
            <Barcode size={32} color={colors.scanFrame} />
            <Text variant="caption" color="inverse" className="text-center">
              Camera access is needed to scan packaged foods.
            </Text>
            <Button
              label="Enable camera"
              fullWidth={false}
              variant="secondary"
              onPress={() => void requestPermission()}
            />
          </View>
        )}
      </ScanFrame>
      {barcode ? (
        <Card className="gap-xs bg-primarySoft">
          <Text variant="caption" color="muted">
            Captured barcode
          </Text>
          <Text variant="body" color="dark">
            {barcode}
            {format ? ` · ${format}` : ""}
          </Text>
          <Button
            label="Scan another"
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              setBarcode("");
              setFormat(null);
              setScanned(false);
              lastScanRef.current = null;
              setMessage(null);
            }}
          />
        </Card>
      ) : null}
      {__DEV__ ? (
        <Input
          label="Developer barcode"
          value={barcode}
          onChangeText={(value) => {
            const normalized = normalizeBarcode(value);
            setBarcode(normalized ?? value);
            setScanned(Boolean(normalized));
          }}
          keyboardType="number-pad"
          placeholder="Type barcode to test lookup"
        />
      ) : null}
      {message ? (
        <Text variant="caption" color={message.includes("offline") ? "muted" : "primary"}>
          {message}
        </Text>
      ) : null}
      {lookup.isFetching ? <Text color="muted">Looking up barcode...</Text> : null}
      {lookup.isError ? (
        <SectionError
          title="Could not look up barcode"
          message="Something went wrong looking that up. Try again in a moment."
          onRetry={() => void lookup.refetch()}
        />
      ) : null}
      {barcode && lookup.data && !lookup.isFetching && !lookup.isError && !food ? (
        <SectionError
          title="Barcode not found"
          message="This packaged food is not in Open Food Facts yet. You can search by name or describe the meal instead."
          onRetry={() => void lookup.refetch()}
        />
      ) : null}
      {food ? (
        <Card className="gap-md">
          <FoodResultRow item={food} onLog={() => setLoggingItem(food)} loading={false} />
        </Card>
      ) : null}
      <LogItemSheet
        item={loggingItem}
        day={day}
        visible={loggingItem !== null}
        onClose={() => setLoggingItem(null)}
      />
    </Screen>
  );
}
