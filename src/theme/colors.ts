/**
 * Brand color tokens. Hex values sourced from the Thrivo App Figma "Design
 * Guide" page (Figma variables) — keep these in sync with that file, not the
 * other way around. The neutral `gray` ramp is a local utility scale for
 * borders/dividers/disabled states that the design guide leaves unspecified.
 */
export const colors = {
  primary: "#09823C", // Thrivo logo green
  primaryHover: "#0A9A47",
  primaryActive: "#076B32",
  primarySoft: "#E8F7EE", // light green tint — success badges / soft fills (V2 auth screens)
  primaryBright: "#27AE60", // brighter green — progress fill, success check (V2 screens)
  progressTrack: "#E0E6EE", // unfilled progress segment (V2 onboarding)
  dark: "#1A1A2E", // Figma: Gray 1 (primary text)
  light: "#F4F6F9", // page background / input fields
  accent: "#F39C12", // Figma: Orange
  accentSoft: "#FEF5E7", // light amber tint — warning/expired badges (V2 auth screens)
  accentText: "#8A6A2A", // amber-dark — tint-on-tint note copy on accentSoft (onboarding NoteBox)
  hairline: "#D8D8D8", // light outline — auth row / input border (Figma auth screens)
  stepText: "#737373", // neutral body copy on onboarding step screens
  white: "#FFFFFF", // Figma: White
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  success: "#09823C", // shares Thrivo Green
  warning: "#F39C12", // shares Orange accent
  error: "#C0392B", // Figma: Thrivo Red
};

export type Colors = typeof colors;
