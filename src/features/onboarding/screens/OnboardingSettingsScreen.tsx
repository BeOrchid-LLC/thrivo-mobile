import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CaretRight, CheckCircle, Lock } from "phosphor-react-native";
import { Button, PageHeader, Screen, SkeletonText, Text } from "@/components";
import { useMe } from "@/features/profile";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useOnboardingPrefill } from "@/features/onboarding/hooks/useOnboardingPrefill";
import { useSaveOnboardingStep } from "@/features/onboarding/hooks/useSaveOnboardingStep";
import BodyStep from "@/features/onboarding/screens/BodyStep";
import GoalStep from "@/features/onboarding/screens/GoalStep";
import NameStep from "@/features/onboarding/screens/NameStep";
import NotificationsStep from "@/features/onboarding/screens/NotificationsStep";
import StartFreeStep from "@/features/onboarding/screens/StartFreeStep";
import TargetStep from "@/features/onboarding/screens/TargetStep";
import WeightStep from "@/features/onboarding/screens/WeightStep";
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from "@/features/onboarding/config";
import type { OnboardingStepProps } from "@/features/onboarding/types";
import { getOnboardingProgress } from "@/features/onboarding/utils/progress";

const STEP_SCREENS: Record<number, (props: OnboardingStepProps) => React.ReactNode> = {
  1: (props) => <NameStep {...props} />,
  2: (props) => <GoalStep {...props} />,
  3: (props) => <WeightStep {...props} />,
  4: (props) => <BodyStep {...props} />,
  5: (props) => <TargetStep {...props} />,
  6: (props) => <StartFreeStep {...props} />,
  7: (props) => <NotificationsStep {...props} />,
};

export function OnboardingSettingsScreen() {
  const profile = useMe();
  const settings = useSettings();
  useOnboardingPrefill();
  const saveStep = useSaveOnboardingStep();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (profile.isLoading || settings.isLoading || !profile.data) {
    return (
      <Screen backgroundColor="white" style={{ gap: 20, paddingTop: 32 }}>
        <PageHeader title="Onboarding setup" />
        <SkeletonText size="heading" />
        <SkeletonText size="body" className="w-2/3" />
      </Screen>
    );
  }

  const progress = getOnboardingProgress(profile.data);
  if (progress.status === "complete") {
    return (
      <Screen backgroundColor="white" style={{ gap: 20, paddingTop: 32 }}>
        <PageHeader title="Onboarding complete" onBack={() => router.back()} />
        <View className="items-center gap-md py-2xl">
          <CheckCircle size={64} weight="fill" color="#16A34A" />
          <Text variant="heading2" className="text-center">
            Your onboarding is complete
          </Text>
          <Text color="muted" className="text-center">
            You can update these details from Settings.
          </Text>
        </View>
      </Screen>
    );
  }

  if (activeStep !== null) {
    const StepScreen = STEP_SCREENS[activeStep];
    return (
      <View className="flex-1">
        {saveError ? (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setSaveError(null)}
            className="bg-red-50 px-lg py-sm"
          >
            <Text color="error">{saveError}</Text>
          </Pressable>
        ) : null}
        <StepScreen
          mode="revisit"
          isSaving={saveStep.isPending}
          onBack={() => setActiveStep(null)}
          onDone={() => setActiveStep(null)}
          onNext={async (fields) => {
            setSaveError(null);
            try {
              await saveStep.save(fields, activeStep, activeStep === TOTAL_ONBOARDING_STEPS);
              setActiveStep(activeStep === TOTAL_ONBOARDING_STEPS ? null : activeStep + 1);
            } catch {
              setSaveError("Could not save this step. Check your connection and try again.");
            }
          }}
        />
      </View>
    );
  }

  const firstIncomplete = progress.firstIncompleteStep ?? 1;
  return (
    <Screen scroll backgroundColor="white" style={{ gap: 20, paddingTop: 32, paddingBottom: 40 }}>
      <PageHeader
        title="Onboarding setup"
        subtitle={`${progress.completedSteps} of ${TOTAL_ONBOARDING_STEPS} complete`}
        onBack={() => router.back()}
      />

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
                <CheckCircle size={24} weight="fill" color="#16A34A" />
              ) : unlocked ? (
                <View className="h-6 w-6 rounded-full border-2 border-primaryBright" />
              ) : (
                <Lock size={22} color="#9CA3AF" />
              )}
              <View className="flex-1">
                <Text className="font-semibold">{step.title}</Text>
                <Text variant="caption" color="muted">
                  {complete
                    ? "Complete"
                    : unlocked
                      ? "Ready to fill in"
                      : "Complete earlier steps first"}
                </Text>
              </View>
              {unlocked ? <CaretRight size={20} color="#6B7280" /> : null}
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Continue setup"
        onPress={() => setActiveStep(firstIncomplete)}
        disabled={!firstIncomplete}
      />
    </Screen>
  );
}
