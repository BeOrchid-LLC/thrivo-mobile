/**
 * Type scale sourced from the Thrivo App Figma "Design Guide" page. The product
 * font is Inter (load the Inter family at app startup via expo-font so this
 * `fontFamily` resolves — otherwise it falls back to the system font).
 *
 * Figma names map to keys as: Header 1 → heading1, Header 2 → heading2,
 * Header 3 → heading3, Body 1 → body, Body 2 → caption. Headings are Inter
 * Semi Bold (600); body is Regular (400); Body 2 is Semi Bold (600).
 */
const fontFamily = "Inter";

export const typography = {
  heading1: {
    fontFamily,
    fontSize: 40,
    fontWeight: "600" as const,
    lineHeight: 48,
  },
  heading2: {
    fontFamily,
    fontSize: 32,
    fontWeight: "600" as const,
    lineHeight: 40,
  },
  heading3: {
    fontFamily,
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
};

export type Typography = typeof typography;
