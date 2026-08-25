/**
 * Brand color tokens. Hex values sourced from the Thrivo App Figma "Design
 * Guide" page (Figma variables) — keep these in sync with that file, not the
 * other way around. The neutral `gray` ramp is a local utility scale for
 * borders/dividers/disabled states that the design guide leaves unspecified.
 */
export const colors = {
  // Sourced from the V2 auth frames (Sign In / Sign Up), which carry a lighter
  // brand green than the older Design Guide value (#09823C). ⚠️ White label copy
  // on this green measures 2.8:1 — below the WCAG 2.2 AA 4.5:1 floor the old
  // green cleared at 4.9:1. Every filled primary button in the app is affected.
  primary: "#55AB68", // Thrivo logo green
  primaryHover: "#6DB77D",
  primaryActive: "#499359",
  primaryTint: "#EAF3DE",
  primarySoft: "#E8F7EE", // light green tint — success badges / soft fills (V2 auth screens)
  primaryBright: "#27AE60", // brighter green — progress fill, success check (V2 screens)
  gradientMid: "#2D5B4A", // dark-green blend stop, dark → primaryBright gradient (trial-upsell card)
  progressTrack: "#E0E6EE", // unfilled progress segment (V2 onboarding)
  loggedGreen: "#90CFAE", // "logged" streak-calendar day fill (ProgressScreen)
  loggedGreenBorder: "#64B889", // "logged" streak-calendar day border (ProgressScreen)
  dark: "#1A1A2E", // Figma: Gray 1 (primary text)
  light: "#F4F6F9", // page background / input fields
  accent: "#E7A03C", // Figma: Orange
  accentSoft: "#FEF5E7", // light amber tint — warning/expired badges (V2 auth screens)
  accentText: "#8A6A2A", // amber-dark — tint-on-tint note copy on accentSoft (onboarding NoteBox)
  warningText: "#854D0E", // Tailwind yellow-800 equivalent for the subscription preview notice
  hairline: "#D8D8D8", // light outline — auth row / input border (Figma auth screens)
  white: "#FFFFFF", // Figma: White
  /** Glass sheen over the dark premium surfaces — white at low alpha. */
  sheen: "rgba(255, 255, 255, 0.16)",
  sheenFade: "rgba(255, 255, 255, 0)",
  /** Lighter neutral for supporting body copy. Distinct from `gray.600`. */
  muted: "#737373",
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
  success: "#55AB68", // shares Thrivo Green
  successBright: "#16A34A", // onboarding completion icon
  warning: "#E7A03C", // shares Orange accent
  error: "#C0392B", // Figma: Thrivo Red
};

export type Colors = typeof colors;
