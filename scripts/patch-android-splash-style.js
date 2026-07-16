#!/usr/bin/env node
/**
 * Run after `expo prebuild` regenerates android/. Patches two Android theme items that
 * Expo's config-plugin mod pipeline can't reliably set:
 *
 * 1. AppTheme (postSplashScreenTheme - what Android swaps to the instant the native splash
 *    ends, before React paints anything) never gets an explicit android:windowBackground
 *    from the RN/Expo template. In system dark mode, AppCompat's DayNight resolution falls
 *    back to a dark default background for that gap, producing a dark flash before our JS
 *    splash (BrandSplash) can render.
 * 2. Theme.App.SplashScreen's icon container can render its own opaque/light contrast
 *    backdrop behind our transparent splash logo.
 *    Setting windowSplashScreenIconBackgroundColor neutralizes that regardless of whether
 *    it's actually the source of the "white box" the flash showed.
 * 3. android:windowDisablePreview=true on Theme.App.SplashScreen. Android shows a separate
 *    "preview window" - a cached placeholder rendered the instant the icon is tapped, before
 *    the real themed window attaches - which does NOT read our current theme attributes.
 *    Confirmed via decompiling a release build with fixes 1+2 correctly compiled in
 *    (aapt2 dump resources showed both values present) that produced zero visual change on
 *    device: whatever was actually visible wasn't reading AppTheme/Theme.App.SplashScreen at
 *    all, pointing at this separate preview-window layer instead of our real splash theme.
 *
 * Both must be a post-prebuild script rather than a config plugin: expo-splash-screen's own
 * internal (unversioned, not user-configurable) Android plugin unconditionally filters out
 * and rebuilds the entire Theme.App.SplashScreen style group, and it always runs after every
 * user-declared plugin's "styles" mod regardless of app.json plugin order - so any config
 * plugin trying to append to that group gets silently overwritten. Running here, strictly
 * after `expo prebuild` has fully finished and flushed styles.xml to disk, is the only point
 * guaranteed to run after that rebuild.
 *
 * App is intentionally light-mode-only (userInterfaceStyle: "light" in app.json), so this
 * only touches the base values/styles.xml - never a values-night variant.
 */
const path = require("path");
const {
  XML,
  AndroidConfig: {
    Styles: { assignStylesValue, getAppThemeGroup, readStylesXMLAsync },
  },
} = require("expo/config-plugins");

// Keep in sync with the expo-splash-screen plugin's backgroundColor in app.json.
const SPLASH_MATCH_COLOR = "#FFFFFF";

async function main() {
  const stylesPath = path.join(
    __dirname,
    "..",
    "android",
    "app",
    "src",
    "main",
    "res",
    "values",
    "styles.xml"
  );
  const xml = await readStylesXMLAsync({ path: stylesPath });

  assignStylesValue(xml, {
    add: true,
    value: SPLASH_MATCH_COLOR,
    name: "android:windowBackground",
    parent: getAppThemeGroup(),
  });

  assignStylesValue(xml, {
    add: true,
    value: SPLASH_MATCH_COLOR,
    name: "windowSplashScreenIconBackgroundColor",
    parent: { name: "Theme.App.SplashScreen" },
  });

  assignStylesValue(xml, {
    add: true,
    value: "true",
    name: "android:windowDisablePreview",
    parent: { name: "Theme.App.SplashScreen" },
  });

  await XML.writeXMLAsync({ path: stylesPath, xml });
  console.log(`Patched ${stylesPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
