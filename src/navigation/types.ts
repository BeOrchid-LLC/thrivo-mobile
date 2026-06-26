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
  "settings/personal-info": undefined;
  "settings/subscription": undefined;
};

export type RootStackParamList = {
  index: undefined;
  "(auth)": undefined;
  "(onboarding)": undefined;
  "(app)": undefined;
};
