const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.useWatchman = false;
config.resolver.blockList = [
  /android[\\/]\.gradle[\\/].*/,
  /android[\\/]app[\\/]build[\\/].*/,
  /android[\\/]build[\\/].*/,
  /android[\\/]build-cache[\\/].*/,
  /android[\\/]\.cxx[\\/].*/,
];

// NativeWind reads global.css for the Tailwind layers; the Reanimated wrapper
// adds the worklets-aware serializer. Order: NativeWind inside, Reanimated outside.
module.exports = wrapWithReanimatedMetroConfig(withNativeWind(config, { input: "./global.css" }));
