import { Screen, LoadingState } from "@/components";

/**
 * Entry route. The root guard (app/_layout) redirects to the correct group as
 * soon as auth/onboarding state resolves; until then we hold a loading view
 * (the splash screen is also held), never a blank flash.
 */
export default function Index() {
  return (
    <Screen padded={false}>
      <LoadingState />
    </Screen>
  );
}
