/**
 * Type scale sourced from the Thrivo App Figma "Design Guide" page. The product
 * font is Inter, loaded at startup via `useFonts` in `app/_layout.tsx`. React
 * Native resolves a weight to a *named* loaded family (not numeric `fontWeight`),
 * so each variant names its family explicitly; `fontWeight` is kept only as a
 * graceful fallback before the fonts finish loading.
 *
 * Figma names map to keys as: Header 1 → heading1, Header 2 → heading2,
 * Header 3 → heading3, Body 1 → body, Body 2 → caption. Headings are Inter
 * Semi Bold (600); body is Regular (400); Body 2 is Semi Bold (600).
 */
const regular = "Inter_400Regular";
const semiBold = "Inter_600SemiBold";

export const typography = {
  heading1: {
    fontFamily: semiBold,
    fontSize: 40,
    fontWeight: "600" as const,
    lineHeight: 48,
  },
  heading2: {
    fontFamily: semiBold,
    fontSize: 32,
    fontWeight: "600" as const,
    lineHeight: 40,
  },
  heading3: {
    fontFamily: semiBold,
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  body: {
    fontFamily: regular,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: semiBold,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
};

export type Typography = typeof typography;
