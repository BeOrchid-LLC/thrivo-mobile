import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CaretRight, CheckCircle, Lock } from "phosphor-react-native";
import { Button, ErrorDialog, PageHeader, Screen, SkeletonText, Text } from "@/components";
import { useMe } from "@/features/profile";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { useSaveOnboardingStep } from "@/features/onboarding/hooks/useSaveOnboardingStep";
import { STEP_SCREENS } from "@/features/onboarding/step-screens";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from "@/features/onboarding/config";
import { getOnboardingProgress } from "@/features/onboarding/utils/progress";
import { colors } from "@/theme/colors";

export function OnboardingSettingsScreen() {
  const profile = useMe();
  const settings = useSettings();
  useOnboardingPrefill();
  const saveStep = useSaveOnboardingStep();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (profile.isLoading || settings.isLoading || !profile.data) {
    return (
      <Screen backgroundColor="white" rhythm="default">
        <PageHeader title="Onboarding setup" />
        <SkeletonText size="heading" />
        <SkeletonText size="body" className="w-2/3" />
      </Screen>
    );
  }

  const progress = getOnboardingProgress(profile.data);
  const isComplete = progress.status === "complete";

  if (activeStep !== null) {
    const StepScreen = STEP_SCREENS[activeStep];
    return (
      <View className="flex-1">
        <ErrorDialog
          message={saveError}
          title="Could not save this step"
          onDismiss={() => setSaveError(null)}
        />
        <StepScreen
          mode="revisit"
          isSaving={saveStep.isPending}
          onBack={() => setActiveStep(null)}
          onDone={() => setActiveStep(null)}
          onNext={async (fields) => {
            setSaveError(null);
            const isLastStep = activeStep === TOTAL_ONBOARDING_STEPS;
            try {
              // Continue walks the flow forward wherever the step was opened
              // from; only the last step ends it and returns to the list. A
              // setup that is already complete cannot complete again, so it
              // skips the completion write and its one-time analytics event.
              await saveStep.save(fields, activeStep, isLastStep && !isComplete);
              setActiveStep(isLastStep ? null : activeStep + 1);
            } catch {
              setSaveError("Check your connection and try again.");
            }
          }}
        />
      </View>
    );
  }

  const firstIncomplete = progress.firstIncompleteStep ?? 1;
  return (
    <Screen
      scroll
      backgroundColor="white"
      rhythm="form"
      header={
        <PageHeader
          title="Onboarding setup"
          subtitle={
            isComplete
              ? "All steps complete — tap any step to edit it"
              : `${progress.completedSteps} of ${TOTAL_ONBOARDING_STEPS} complete`
          }
          onBack={() => router.back()}
        />
      }
      footer={
        isComplete ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <Button
            label="Continue setup"
            onPress={() => setActiveStep(firstIncomplete)}
            disabled={!firstIncomplete}
          />
        )
      }
      style={{ paddingTop: 0, paddingBottom: 16 }}
    >
      {/* Header and primary action are sticky; only the step list scrolls. */}
      <View className="gap-sm">
        {ONBOARDING_STEPS.map((step) => {
          const complete = progress.completed[step.key] === true;
          const unlocked = step.step <= firstIncomplete || complete;
          return (
            <Pressable
              key={step.key}
              accessibilityRole={unlocked ? "button" : undefined}
              disabled={!unlocked}
              onPress={() => setActiveStep(step.step)}
              className={`flex-row items-center gap-md border-b border-gray-200 py-lg ${
                unlocked ? "" : "opacity-50"
              }`}
            >
              {complete ? (
                <CheckCircle size={24} weight="fill" color={colors.successBright} />
              ) : unlocked ? (
                <View className="h-6 w-6 rounded-full border-2 border-primaryBright" />
              ) : (
                <Lock size={22} color={colors.gray[400]} />
              )}
              <View className="flex-1">
                <Text className="font-semibold">{step.title}</Text>
                <Text variant="caption" color="muted">
                  {complete
                    ? "Complete — tap to edit"
                    : unlocked
                      ? "Ready to fill in"
                      : "Complete earlier steps first"}
                </Text>
              </View>
              {unlocked ? <CaretRight size={20} color={colors.gray[500]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
