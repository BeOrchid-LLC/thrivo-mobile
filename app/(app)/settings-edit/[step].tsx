import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ErrorDialog, Text } from "@/components";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { useSaveOnboardingStep } from "@/features/onboarding/hooks/useSaveOnboardingStep";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from "@/features/onboarding/config";
import { STEP_SCREENS } from "@/features/onboarding/step-screens";

/**
 * Deep-links a single onboarding step in "settings" chrome (no progress bar,
 * white background) so the user can re-edit any field after onboarding.
 *
 * Route: /(app)/settings-edit/[step] where [step] is an OnboardingStepKey. It
 * sits beside the tabs rather than inside them, so it covers the tab bar —
 * these are full-page tasks, not a tab you browse.
 *
 * Called from SettingsScreen for Targets and activity.
 */
export default function SettingsEditStepScreen() {
  const { step: stepKey } = useLocalSearchParams<{ step: string }>();
  const stepDef = ONBOARDING_STEPS.find((s) => s.key === stepKey);
  const stepNumber = stepDef?.step ?? null;
  const StepScreen = stepNumber !== null ? STEP_SCREENS[stepNumber] : null;

  useOnboardingPrefill();
  const saveStep = useSaveOnboardingStep();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!StepScreen || stepNumber === null) {
    return (
      <View className="flex-1 items-center justify-center p-lg">
        <Text color="error">Unknown settings step: {stepKey}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ErrorDialog
        message={saveError}
        title="Could not save"
        onDismiss={() => setSaveError(null)}
      />
      <StepScreen
        mode="revisit"
        variant="settings"
        isSaving={saveStep.isPending}
        onBack={() => router.back()}
        onDone={() => router.back()}
        onNext={async (fields) => {
          setSaveError(null);
          try {
            const isLast = stepNumber === TOTAL_ONBOARDING_STEPS;
            await saveStep.save(fields, stepNumber, isLast);
            router.back();
          } catch {
            setSaveError("Check your connection and try again.");
          }
        }}
      />
    </View>
  );
}
