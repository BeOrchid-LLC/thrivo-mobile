#!/usr/bin/env node
/**
 * Run after `expo prebuild` regenerates android/. Patches Android splash resources
 * and theme items that Expo's config-plugin mod pipeline can't reliably preserve:
 *
 * 1. AppTheme (postSplashScreenTheme - what Android swaps to the instant the native splash
 *    ends, before React paints anything) never gets an explicit android:windowBackground
 *    from the RN/Expo template. In system dark mode, AppCompat's DayNight resolution falls
 *    back to a dark default background for that gap, producing a dark flash before our JS
 *    splash (BrandSplash) can render.
 * 2. Expo composites the configured splash background into each generated
 *    splashscreen_logo.png. Rebuild those density assets from splash-new.png with a
 *    transparent canvas so the theme owns the full-screen background.
 * 3. Theme.App.SplashScreen's icon container can render its own opaque/light contrast
 *    backdrop behind our transparent splash logo. Matching it to the splash resource
 *    prevents a separate contrasting icon background.
 * 4. android:windowDisablePreview=true remains a secondary preview-transition mitigation;
 *    it is not the primary fix for pixels baked into splashscreen_logo.png.
 *
 * Both must be a post-prebuild script rather than a config plugin: expo-splash-screen's own
 * internal (unversioned, not user-configurable) Android plugin unconditionally filters out
 * and rebuilds the entire Theme.App.SplashScreen style group, and it always runs after every
 * user-declared plugin's "styles" mod regardless of app.json plugin order - so any config
 * plugin trying to append to that group gets silently overwritten. Running here, strictly
 * after `expo prebuild` has fully finished and flushed styles.xml to disk, is the only point
 * guaranteed to run after that rebuild.
 *
 * The base styles reference splashscreen_background, whose values-night resource supplies
 * the dark color without requiring a second styles file.
 */
const fs = require("fs").promises;
const path = require("path");
const { generateImageAsync } = require("@expo/image-utils");
const {
  XML,
  AndroidConfig: {
    Styles: { assignStylesValue, getAppThemeGroup, readStylesXMLAsync },
  },
} = require("expo/config-plugins");

const SPLASH_BACKGROUND_RESOURCE = "@color/splashscreen_background";
const SPLASH_DENSITIES = [
  { name: "mdpi", multiplier: 1 },
  { name: "hdpi", multiplier: 1.5 },
  { name: "xhdpi", multiplier: 2 },
  { name: "xxhdpi", multiplier: 3 },
  { name: "xxxhdpi", multiplier: 4 },
];
const SPLASH_CANVAS_SIZE_DP = 288;

async function regenerateAndroidSplashImages(projectRoot) {
  const sourcePath = path.join(projectRoot, "src", "assets", "splash-new.png");
  await fs.access(sourcePath);

  await Promise.all(
    SPLASH_DENSITIES.flatMap(({ name, multiplier }) => {
      const size = Math.round(SPLASH_CANVAS_SIZE_DP * multiplier);
      return [
        { directory: `drawable-${name}`, size },
        { directory: `drawable-night-${name}`, size },
      ].map(async ({ directory, size: imageSize }) => {
        const { source } = await generateImageAsync(
          { projectRoot },
          {
            src: sourcePath,
            width: imageSize,
            height: imageSize,
            resizeMode: "contain",
            backgroundColor: "transparent",
          }
        );
        const outputDirectory = path.join(
          projectRoot,
          "android",
          "app",
          "src",
          "main",
          "res",
          directory
        );
        await fs.mkdir(outputDirectory, { recursive: true });
        await fs.writeFile(path.join(outputDirectory, "splashscreen_logo.png"), source);
      });
    })
  );
}

async function main() {
  const projectRoot = path.join(__dirname, "..");
  const stylesPath = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "res",
    "values",
    "styles.xml"
  );
  const xml = await readStylesXMLAsync({ path: stylesPath });

  await regenerateAndroidSplashImages(projectRoot);

  assignStylesValue(xml, {
    add: true,
    value: SPLASH_BACKGROUND_RESOURCE,
    name: "android:windowBackground",
    parent: getAppThemeGroup(),
  });

  assignStylesValue(xml, {
    add: true,
    value: SPLASH_BACKGROUND_RESOURCE,
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
  console.log(`Regenerated Android splash images and patched ${stylesPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
