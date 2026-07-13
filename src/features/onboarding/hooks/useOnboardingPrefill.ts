import { useEffect, useMemo, useRef } from "react";
import { useMe } from "@/features/profile";
import { useSettings } from "@/features/settings";
import { useOnboardingDraft, useOnboardingDraftActions } from "@/stores";
import { buildOnboardingPrefill } from "../utils/prefill";

export function useOnboardingPrefill() {
  const draft = useOnboardingDraft();
  const { setFields } = useOnboardingDraftActions();
  const profile = useMe();
  const settings = useSettings();
  const seeded = useRef(false);
  const merged = useMemo(
    () => buildOnboardingPrefill(draft, profile.data, settings.data),
    [draft, profile.data, settings.data]
  );

  useEffect(() => {
    if (seeded.current || (!profile.data && !settings.data)) return;
    seeded.current = true;
    setFields(merged);
  }, [merged, profile.data, setFields, settings.data]);

  return {
    draft: merged,
    user: profile.data,
    settings: settings.data,
    isLoading: profile.isLoading || settings.isLoading,
  };
}
