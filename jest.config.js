/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  // jest-expo cold-start + RNTL render is slow on first suite; give it headroom.
  testTimeout: 30000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Transform RN / Expo ESM packages that ship untranspiled.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|@tanstack/.*))",
  ],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
};
