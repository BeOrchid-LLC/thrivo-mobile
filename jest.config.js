/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Transform RN / Expo ESM packages that ship untranspiled.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|@tanstack/.*))",
  ],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
};
