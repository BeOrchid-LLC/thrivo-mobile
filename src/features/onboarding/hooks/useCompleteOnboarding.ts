import { useCallback } from "react";
import { ApiError } from "@/api";
import type { User, ActivationIntent, UpdateProfilePayload } from "@/contracts";
import { useUpdateProfile } from "@/features/profile";
import { monitoring } from "@/lib";
import { type OnboardingDraft, useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { ONBOARDING_COMPLETE_STEP } from "../config";

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
 * Onboarding's save is a single request at the end of the flow, so a failure has
 * to be loud. Sentry gets the exception; a dev console line gets the status and
 * the field names, because a 4xx here is nearly always a payload the contract
 * rejected and the field list is what identifies it. Values stay out of the log
 * — they are health PII.
 *
 * The dev line is `console.log`, not `console.error`, for the reason
 * `logAuthError` states: in dev `console.error` raises a LogBox toast that sits
 * over whatever screen you are on. The screen already renders its own error;
 * this is only a breadcrumb.
 */
function reportSubmitFailure(
  error: unknown,
  activationIntent: ActivationIntent,
  payload: UpdateProfilePayload
): void {
  const context = {
    flow: "onboarding",
    activationIntent,
    sentFields: Object.keys(payload),
    ...(error instanceof ApiError
      ? { code: error.code, status: error.status, details: error.details }
      : {}),
  };
  monitoring.captureException(error, context);
  if (__DEV__) console.log("[onboarding] profile save failed", context, error);
}

/**
 * Submit the reusable onboarding draft to the profile API. This replaces the
 * demo completion path: the server computes targets, updates progress, and
 * activates the account lifecycle on skip/start/complete intents.
 */
export function useSubmitOnboarding() {
  const draft = useOnboardingDraft();
  const { reset } = useOnboardingDraftActions();
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
        // Always report. A failed write here loses every answer the user typed —
        // steps 1-4 only touch the local draft, so this request *is* the save.
        // Swallowing it silently is why a lost onboarding leaves no trace at all.
        reportSubmitFailure(error, activationIntent, payload);
        if (options.silent) {
          // Network failure on a skip/complete step: do not mark the user as
          // onboarded locally. The server remains the source of truth; the
          // next session hydration will re-check and reroute if needed.
          return null;
        }
        throw error;
      }
    },
    [draft, reset, updateProfile]
  );

  return {
    submit,
    isPending: updateProfile.isPending,
    error: updateProfile.error,
  };
}

export function useCompleteOnboarding() {
  const { submit, isPending, error } = useSubmitOnboarding();
  const complete = useCallback(
    () => submit("complete", { onboardingStep: ONBOARDING_COMPLETE_STEP }),
    [submit]
  );
  return { complete, isPending, error };
}
