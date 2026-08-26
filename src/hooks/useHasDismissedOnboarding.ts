import { useOnboardingDismissedFor, useUserId } from "@/stores";

/**
 * Whether the signed-in user has already been through to the app on this
 * device, which makes the onboarding flow a closed gate for them.
 *
 * The stored value is a user id rather than a flag, so it answers `false` for
 * anyone else who signs in on the same device — the record belongs to a person,
 * not to the phone.
 */
export function useHasDismissedOnboarding(): boolean {
  const userId = useUserId();
  const dismissedFor = useOnboardingDismissedFor();
  return userId !== null && dismissedFor === userId;
}
