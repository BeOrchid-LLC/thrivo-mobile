/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  // jest-expo cold-start + RNTL render is slow on first suite; give it headroom.
  testTimeout: 30000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // The package's `exports` map only declares the `import` condition, which Jest's
    // CJS resolver skips — map the root barrel and every subpath to the built files.
    // (The package is in the transform allowlist below, so its ESM is transpiled.)
    "^@beorchid-llc/thrivo-contracts$":
      "<rootDir>/node_modules/@beorchid-llc/thrivo-contracts/dist/index.js",
    "^@beorchid-llc/thrivo-contracts/(.*)$":
      "<rootDir>/node_modules/@beorchid-llc/thrivo-contracts/dist/$1.js",
  },
  // Transform RN / Expo ESM packages that ship untranspiled.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@beorchid-llc/thrivo-contracts|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|@tanstack/.*))",
  ],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
};
