#!/usr/bin/env node
/**
 * Generate the source brand assets used by the Expo splash screen and app icons.
 *
 * This is intentionally deterministic and source-preserving: all outputs are
 * derived from the existing logo sources, with only scaling and compositing
 * onto the required canvases. The splash uses the exact ThrivoMark vector so
 * Android can rasterize it directly at each density without enlarging a
 * smaller intermediate PNG. Run it before an Android prebuild when a source
 * logo changes.
 */
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const {
  compositeImagesAsync,
  generateImageAsync,
  generateImageBackgroundAsync,
} = require("@expo/image-utils");
const {
  SPLASH_CANVAS_SIZE,
  SPLASH_MARK_SIZE,
  SPLASH_MARK_SOURCE,
} = require("./brand-asset-config");

const PROJECT_ROOT = path.join(__dirname, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "src", "assets");
const SOURCE_LOGO = path.join(ASSETS_DIR, "logo.png");
const SOURCE_SPLASH_MARK = path.join(PROJECT_ROOT, SPLASH_MARK_SOURCE);

const ICON_LOGO_SIZE = 484; // Approximately 10% more margin than the existing icon.
const ADAPTIVE_ICON_LOGO_SIZE = 375; // Approximately 10% more margin than the existing foreground.
const ICON_CANVAS_SIZE = 1600; // Preserve the existing general Expo icon resolution.

async function createCenteredAsset({
  backgroundColor,
  canvasSize,
  outputPath,
  sourcePath,
  sourceSize,
}) {
  const background = await generateImageBackgroundAsync({
    width: canvasSize,
    height: canvasSize,
    backgroundColor,
  });
  const foreground = sourcePath.endsWith(".svg")
    ? await sharp(sourcePath)
        .resize(sourceSize, sourceSize, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .png()
        .toBuffer()
    : (
        await generateImageAsync(
          { projectRoot: PROJECT_ROOT },
          {
            src: sourcePath,
            width: sourceSize,
            height: sourceSize,
            resizeMode: "contain",
            backgroundColor: "transparent",
          }
        )
      ).source;
  const result = await compositeImagesAsync({
    background,
    foreground,
    x: Math.round((canvasSize - sourceSize) / 2),
    y: Math.round((canvasSize - sourceSize) / 2),
  });

  await fs.writeFile(outputPath, result);
}

async function main() {
  await fs.access(SOURCE_LOGO);
  await fs.access(SOURCE_SPLASH_MARK);

  await createCenteredAsset({
    backgroundColor: "transparent",
    canvasSize: SPLASH_CANVAS_SIZE,
    outputPath: path.join(ASSETS_DIR, "splash-new.png"),
    sourcePath: SOURCE_SPLASH_MARK,
    sourceSize: SPLASH_MARK_SIZE,
  });

  await createCenteredAsset({
    backgroundColor: "#FFFFFF",
    canvasSize: ICON_CANVAS_SIZE,
    outputPath: path.join(ASSETS_DIR, "icon.png"),
    sourcePath: SOURCE_LOGO,
    sourceSize: ICON_LOGO_SIZE,
  });

  await createCenteredAsset({
    backgroundColor: "transparent",
    canvasSize: SPLASH_CANVAS_SIZE,
    outputPath: path.join(ASSETS_DIR, "adaptive-icon.png"),
    sourcePath: SOURCE_LOGO,
    sourceSize: ADAPTIVE_ICON_LOGO_SIZE,
  });

  console.log("Generated splash-new.png, icon.png, and adaptive-icon.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
