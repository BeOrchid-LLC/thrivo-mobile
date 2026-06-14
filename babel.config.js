module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo includes the expo-router and reanimated transforms.
    presets: ["babel-preset-expo"],
  };
};
