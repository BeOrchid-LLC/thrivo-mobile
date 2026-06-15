import { useCallback } from "react";
import {
  useDemoProfileActions,
  useOnboardingDraft,
  useOnboardingDraftActions,
  useSessionActions,
} from "@/stores";

/**
 * Finalize onboarding (demo): seed the demo profile/targets from the draft, flip
 * the session's `isOnboarded` flag — which the root guard observes to route into
 * `(app)` — then clear the draft. Shared by the start-free and premium screens.
 */
export function useCompleteOnboarding() {
  const draft = useOnboardingDraft();
  const { reset } = useOnboardingDraftActions();
  const { seedFromDraft } = useDemoProfileActions();
  const { setOnboarded } = useSessionActions();

  return useCallback(() => {
    seedFromDraft(draft);
    setOnboarded(true);
    reset();
  }, [draft, seedFromDraft, setOnboarded, reset]);
}
