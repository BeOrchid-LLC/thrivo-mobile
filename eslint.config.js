const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");

// Flat config (ESLint 9). Expo's shared config provides the React/React Native/
// TypeScript rule set; eslint-config-prettier disables anything that fights
// Prettier; the trailing block re-asserts our two workspace rules.
//
// Plugins are per-config-object in flat config, so reuse the exact
// @typescript-eslint plugin instance Expo already registers — otherwise our
// rule references can't find it.
const tsEslintPlugin = expoConfig.find((c) => c.plugins?.["@typescript-eslint"])?.plugins?.[
  "@typescript-eslint"
];

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tsEslintPlugin },
    rules: {
      // Surface unused code, but allow intentionally-unused args prefixed with _.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` is allowed only with an explanatory comment (workspace rule); flag bare usage.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "babel.config.js",
      "jest.config.js",
      "metro.config.js",
      "tailwind.config.ts",
    ],
  },
]);
