import { Screen, BrandSplash } from "@/components";

/**
 * Entry route. The root guard (app/_layout) redirects to the correct group as
 * soon as auth/onboarding state resolves; until then we hold the branded splash,
 * never a blank flash.
 */
export default function Index() {
  return (
    <Screen padded={false}>
      <BrandSplash />
    </Screen>
  );
}
