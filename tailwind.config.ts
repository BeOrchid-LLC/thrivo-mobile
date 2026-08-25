import type { Config } from "tailwindcss";
// Single source of truth: design tokens live in src/theme and are imported here
// so NativeWind classes (className) and runtime JS token access (StyleSheet,
// SVG, ActivityIndicator color) can never drift. Edit tokens in src/theme only.
import { colors } from "./src/theme/colors";
import { spacing } from "./src/theme/spacing";
import { radii } from "./src/theme/radii";
import { sizing } from "./src/theme/sizing";
import { typography } from "./src/theme/typography";

const px = (n: number) => `${n}px`;
const mapPx = (scale: Record<string, number>) =>
  Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, px(v)]));

// Tailwind fontSize entries are [size, { lineHeight }] tuples; derive them from
// the Figma type scale so `text-heading1`, `text-body`, etc. carry line height.
const fontSize = Object.fromEntries(
  Object.entries(typography).map(([name, t]) => [
    name,
    [px(t.fontSize), { lineHeight: px(t.lineHeight) }],
  ])
);

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      spacing: mapPx(spacing),
      borderRadius: mapPx(radii),
      // Control/icon dimensions live in their own scale rather than in
      // `spacing`, so `h-control` exists without also minting a meaningless
      // `p-control`. Tailwind merges these into the defaults, so `h-lg` and the
      // rest of the spacing-derived sizes keep working.
      height: mapPx(sizing),
      width: mapPx(sizing),
      minHeight: mapPx(sizing),
      minWidth: mapPx(sizing),
      letterSpacing: {
        /** Uppercase eyebrow labels (Figma). Always paired with `uppercase`. */
        label: "0.78px",
      },
      fontFamily: {
        regular: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
      fontSize,
    },
  },
  plugins: [],
} satisfies Config;
