import { useCallback } from "react";
import type { User, ActivationIntent, UpdateProfilePayload } from "@/contracts";
import { useUpdateProfile } from "@/features/profile";
import {
  useAccountStatus,
  type OnboardingDraft,
  useOnboardingDraft,
  useOnboardingDraftActions,
  useSessionActions,
} from "@/stores";

interface SubmitOptions {
  silent?: boolean;
  onboardingStep?: number;
  fields?: Partial<OnboardingDraft>;
}

const stripUndefined = (payload: UpdateProfilePayload): UpdateProfilePayload => {
  const clean: UpdateProfilePayload = {};
  for (const [key, value] of Object.entries(payload) as [
    keyof UpdateProfilePayload,
    UpdateProfilePayload[keyof UpdateProfilePayload],
  ][]) {
    if (value !== undefined) {
      clean[key] = value as never;
    }
  }
  return clean;
};

/**
 * Submit the reusable onboarding draft to the profile API. This replaces the
 * demo completion path: the server computes targets, updates progress, and
 * activates the account lifecycle on skip/start/complete intents.
 */
export function useSubmitOnboarding() {
  const draft = useOnboardingDraft();
  const { reset } = useOnboardingDraftActions();
  const accountStatus = useAccountStatus();
  const { setAccountStatus } = useSessionActions();
  const updateProfile = useUpdateProfile();

  const submit = useCallback(
    async (
      activationIntent: ActivationIntent,
      options: SubmitOptions = {}
    ): Promise<User | null> => {
      const mergedDraft = { ...draft, ...options.fields };
      const payload = stripUndefined({
        ...mergedDraft,
        activationIntent,
        onboardingStep: options.onboardingStep ?? mergedDraft.onboardingStep,
      });

      try {
        const user = await updateProfile.mutateAsync(payload);
        reset();
        return user;
      } catch (error) {
        if (options.silent) {
          if (accountStatus === "dormant") {
            setAccountStatus("free_trial");
          }
          return null;
        }
        throw error;
      }
    },
    [accountStatus, draft, reset, setAccountStatus, updateProfile]
  );

  return {
    submit,
    isPending: updateProfile.isPending,
    error: updateProfile.error,
  };
}

export function useCompleteOnboarding() {
  const { submit, isPending, error } = useSubmitOnboarding();
  const complete = useCallback(() => submit("complete", { onboardingStep: 8 }), [submit]);
  return { complete, isPending, error };
}
