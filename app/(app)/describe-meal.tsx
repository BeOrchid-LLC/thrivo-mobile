import { router } from "expo-router";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { DescribeMealScreen } from "@/features/food-logging";

/** Pushed over the tab bar: a form with its actions pinned to the bottom. */
export default function DescribeMeal() {
  const day = useCurrentDay();

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/log");
  };

  // A logged estimate leaves the form with nothing left to do, so it returns to
  // the food tracker the same way the back arrow does — the meal is already at
  // the head of the recent list there, which is the confirmation the screen
  // itself used to have to fake with a line of text.
  return <DescribeMealScreen day={day} onBack={back} onLogged={back} />;
}
