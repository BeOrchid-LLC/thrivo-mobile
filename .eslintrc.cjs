/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: {
    es2022: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    // Surface unused code, but allow intentionally-unused args prefixed with _.
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // `any` is allowed only with an explanatory comment (workspace rule); flag bare usage.
    "@typescript-eslint/no-explicit-any": "warn",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".expo/",
    "babel.config.js",
    "jest.config.js",
    ".eslintrc.cjs",
  ],
};
