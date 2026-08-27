/**
 * Typed route declarations mirroring the Expo Router tree (MOBILE_ARCHITECTURE
 * §5). Three guarded groups: (auth), (onboarding), (app). Navigation params
 * carry IDs only — target screens fetch on mount via their feature hook.
 */

export type AuthStackParamList = {
  welcome: undefined;
  "sign-in": { authError?: string } | undefined;
  email: undefined;
  otp: { email: string; source?: "email" | "sign-in" };
};

export type OnboardingStackParamList = {
  name: undefined;
  goal: undefined;
  weight: undefined;
  body: undefined;
  target: undefined;
  "start-free": undefined;
  notifications: undefined;
};

/** Tabs in the authenticated group (free + premium; premium gated in-screen). */
export type AppTabParamList = {
  dashboard: undefined;
  log: undefined;
  metrics: undefined;
  checkin: undefined;
  settings: undefined;
};

/** Non-tab routes reachable within (app) by push (hidden from the tab bar). */
export type AppStackParamList = {
  foods: undefined;
  /** Pushed over the tab bar, so it lives beside the tabs rather than in them. */
  "personal-info": undefined;
  /** Same — the reminder schedule is a full-page task, not a tab. */
  "food-log-reminder": undefined;
  /** Same — the settings-chrome onboarding checklist. */
  "onboarding-setup": undefined;
  /** Same — a single onboarding step re-opened from Settings. */
  "settings-edit/[step]": { step: string };
  /** Same — the paywall covers the tab bar so nothing competes with the price. */
  subscription: undefined;
  /** Same — a full-page form; a tab bar under it competes with Save. */
  "create-food": undefined;
  /** Same — the camera frame owns the page while a scan is in progress. */
  "scan-barcode": undefined;
  /** Same — a form whose actions are pinned where the tab bar would sit. */
  "describe-meal": undefined;
};

export type RootStackParamList = {
  index: undefined;
  "(auth)": undefined;
  "(onboarding)": undefined;
  "(app)": undefined;
};
