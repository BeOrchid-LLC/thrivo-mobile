module.exports = function (api) {
  api.cache(true);
  return {
    // `jsxImportSource: nativewind` + the nativewind preset enable `className`
    // on React Native primitives. babel-preset-expo still provides the
    // expo-router transform.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // Reanimated 4 ships its babel transform via react-native-worklets; it must
    // be the LAST plugin in the list.
    plugins: ["react-native-worklets/plugin"],
  };
};
