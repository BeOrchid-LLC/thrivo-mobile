import { router } from "expo-router";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { CreateFoodScreen } from "@/features/food-logging";

/**
 * Pushed over the tab bar rather than rendered inside the Log tab: creating a
 * food is a full-page form, and a tab bar underneath it both competes with the
 * Save button and invites a half-filled form to be abandoned by a tap.
 */
export default function CreateFood() {
  const day = useCurrentDay();

  const toLog = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/log");
  };

  // Logging the food it just created leaves the form with nothing left to do,
  // so it returns to the food tracker the same way the back arrow does — the
  // new entry is already at the head of the recent list there.
  return <CreateFoodScreen day={day} onBack={toLog} onLogged={toLog} />;
}
