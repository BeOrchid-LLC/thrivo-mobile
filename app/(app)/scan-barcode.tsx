import { router } from "expo-router";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { ScanBarcodeScreen } from "@/features/food-logging";

/** Pushed over the tab bar so the camera frame owns the page. */
export default function ScanBarcode() {
  const day = useCurrentDay();

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/log");
  };

  return <ScanBarcodeScreen day={day} onBack={back} />;
}
