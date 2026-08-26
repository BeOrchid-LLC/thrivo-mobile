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

  return <DescribeMealScreen day={day} onBack={back} />;
}
