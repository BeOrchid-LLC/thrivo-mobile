/**
 * Type scale sourced from the Thrivo App Figma "Design Guide" page. The product
 * font is Inter, loaded at startup via `useFonts` in `app/_layout.tsx`. React
 * Native resolves a weight to a *named* loaded family (not numeric `fontWeight`),
 * so each variant names its family explicitly; `fontWeight` is kept only as a
 * graceful fallback before the fonts finish loading.
 *
 * Figma names map to keys as: Header 1 → heading1, Header 2 → heading2,
 * Header 3 → heading3, Body 1 → body, Body 2 → caption. The additional
 * variants below cover the few product-wide display, numeric, and supporting
 * text roles; screens should consume these named variants instead of defining
 * local font sizes or line heights.
 */
const regular = "Inter_400Regular";
const semiBold = "Inter_600SemiBold";
const bold = "Inter_700Bold";

/** The loaded Inter families, for the few places that need one by name. */
export const fontFamilies = {
  regular,
  medium: "Inter_500Medium",
  semiBold,
  bold: "Inter_700Bold",
} as const;

export const typography = {
  hero: {
    fontFamily: semiBold,
    fontSize: 36,
    fontWeight: "600" as const,
    lineHeight: 40,
  },
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
    lineHeight: 24,
  },
  /**
   * The left-aligned page question on the V2 onboarding frames (S1-S7).
   *
   * Read from the Figma Dev Mode server: Inter Bold, 26px, 31.2px leading,
   * -0.5px tracking — identical on all seven screens. It sits between `metric`
   * (24) and `title` (28), and is the one ramp entry that is bold rather than
   * semibold, so neither could stand in. Tracking lives in the tailwind
   * letterSpacing map as `title`.
   */
  pageTitle: {
    fontFamily: bold,
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 31.2,
  },
  title: {
    fontFamily: semiBold,
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 42,
  },
  metric: {
    fontFamily: semiBold,
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  otp: {
    fontFamily: semiBold,
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  "body-lg": {
    fontFamily: regular,
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: regular,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  "body-sm": {
    fontFamily: regular,
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  label: {
    fontFamily: regular,
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontFamily: semiBold,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  micro: {
    fontFamily: regular,
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
};

export type Typography = typeof typography;

/**
 * The family and size of a ramp variant, **without** its line height — the font
 * a `TextInput` should be given.
 *
 * React Native adds a line height's extra leading above the text in a TextInput
 * on iOS rather than splitting it, so any variant whose line height exceeds its
 * font size (every one of them) pushes the glyphs down and leaves the field
 * looking bottom-heavy: more space above the text than below it. Text renders
 * fine with the leading, which is why `Text` keeps using the classes.
 *
 * The two Android-only properties are the same fix on that platform: the font's
 * own padding is the leading equivalent there, and a field that centres its
 * content needs to be told to centre the text too.
 */
export function inputFont(variant: keyof Typography): {
  fontFamily: string;
  fontSize: number;
  includeFontPadding: false;
  textAlignVertical: "center";
} {
  const { fontFamily, fontSize } = typography[variant];
  return { fontFamily, fontSize, includeFontPadding: false, textAlignVertical: "center" };
}
