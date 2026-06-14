import { PlaceholderScreen } from "@/components";

/**
 * Onboarding S2 auth gate: Google · Apple · email (password|OTP) (ADR-0017).
 * Phase 6 replaces this with the auth feature's SignInScreen.
 */
export default function SignIn() {
  return <PlaceholderScreen title="Sign in" subtitle="Google · Apple · email" />;
}
