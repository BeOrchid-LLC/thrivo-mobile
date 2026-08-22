import { useCallback } from "react";
import type { UpdateProfilePayload } from "@/contracts";
import { useMe, useUpdateProfile } from "@/features/profile";
import { useUpdateSettings } from "@/features/settings";
import { analytics } from "@/lib";
import type { OnboardingDraft } from "@/stores";

export function useSaveOnboardingStep() {
  const profile = useMe();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();

  const save = useCallback(
    async (fields: Partial<OnboardingDraft>, step: number, complete = false): Promise<void> => {
      const { unitSystem, onboardingStep: _step, ...profileFields } = fields;
      const currentStep = profile.data?.onboardingStep ?? 1;
      const payload: UpdateProfilePayload = {
        ...profileFields,
        onboardingStep: complete ? 8 : Math.max(currentStep, step),
        ...(complete ? { activationIntent: "complete" as const } : {}),
      };

      await updateProfile.mutateAsync(payload);
      if (unitSystem) {
        await updateSettings.mutateAsync({ unitSystem });
      }
      // Only the final step counts as completing onboarding; the intermediate
      // saves are progress, not conversion.
      if (complete) analytics.track("thrivo.onboarding_completed");
    },
    [profile.data?.onboardingStep, updateProfile, updateSettings]
  );

  return {
    save,
    isPending: updateProfile.isPending || updateSettings.isPending,
    error: updateProfile.error ?? updateSettings.error,
  };
}
