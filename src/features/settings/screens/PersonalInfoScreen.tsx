import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Camera } from "phosphor-react-native";
import { Button, Input, PageHeader, Screen, SelectInput, SelectSheet, Text } from "@/components";
import type { Goal, Sex, UpdateProfilePayload } from "@/contracts";
import {
  FileTooLargeError,
  formatBytes,
  useAvatarUpload,
  useMe,
  useUpdateProfile,
} from "@/features/profile";
import { colors } from "@/theme";
import {
  heightToCm,
  heightUnitFor,
  heightFromCm,
  roundTo,
  weightFromKg,
  weightToKg,
  weightUnitFor,
} from "@/utils";
import { parsePositiveInteger } from "@/features/onboarding/utils/validation";
import { useSettings } from "../hooks/useSettings";

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Build muscle",
};

const GOAL_ORDER: Goal[] = ["lose", "maintain", "gain"];
const GOAL_OPTIONS = GOAL_ORDER.map((value) => ({ label: GOAL_LABELS[value], value }));

const SEX_LABELS: Record<Sex, string> = {
  female: "Female",
  male: "Male",
  prefer_not_to_say: "Prefer not to say",
};

const SEX_ORDER: Sex[] = ["female", "male", "prefer_not_to_say"];
const SEX_OPTIONS = SEX_ORDER.map((value) => ({ label: SEX_LABELS[value], value }));

function parsePositive(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function PersonalInfoScreen() {
  const profile = useMe();
  const settings = useSettings();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useAvatarUpload();
  const user = profile.data;
  const unitSystem = settings.data?.unitSystem ?? "metric";
  const weightUnit = weightUnitFor(unitSystem);
  const heightUnit = heightUnitFor(unitSystem);

  const changeAvatar = () => {
    avatarUpload.mutate(undefined, {
      onError: (error) => {
        if (error instanceof FileTooLargeError) {
          Alert.alert(
            "Photo too large",
            `Please choose an image under ${formatBytes(error.maxBytes)}.`
          );
          return;
        }
        if (error instanceof Error && error.message === "PERMISSION_DENIED") {
          Alert.alert("Photo access needed", "Allow photo access to set a profile picture.");
          return;
        }
        Alert.alert("Upload failed", "We couldn't update your photo. Please try again.");
      },
    });
  };

  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState<Goal>("lose");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [editingSelect, setEditingSelect] = useState<"goal" | "sex" | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.name);
    setGoal(user.goal ?? "lose");
    setCurrentWeight(
      user.weightKg
        ? String(roundTo(weightFromKg(Number.parseFloat(user.weightKg), unitSystem)))
        : ""
    );
    setTargetWeight(
      user.targetWeightKg
        ? String(roundTo(weightFromKg(Number.parseFloat(user.targetWeightKg), unitSystem)))
        : ""
    );
    setAge(user.age ? String(user.age) : "");
    setHeight(
      user.heightCm
        ? String(roundTo(heightFromCm(Number.parseFloat(user.heightCm), unitSystem)))
        : ""
    );
    setSex(user.sex ?? "female");
  }, [unitSystem, user]);

  const save = () => {
    const payload: UpdateProfilePayload = {
      firstName: fullName.trim(),
      goal,
      sex,
      ageYears: parsePositiveInteger(age),
      currentWeightKg:
        parsePositive(currentWeight) !== undefined
          ? roundTo(weightToKg(parsePositive(currentWeight)!, unitSystem))
          : undefined,
      targetWeightKg:
        parsePositive(targetWeight) !== undefined
          ? roundTo(weightToKg(parsePositive(targetWeight)!, unitSystem))
          : undefined,
      heightCm:
        parsePositive(height) !== undefined
          ? roundTo(heightToCm(parsePositive(height)!, unitSystem))
          : undefined,
    };

    updateProfile.mutate(payload, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <Screen scroll backgroundColor={colors.white} style={{ gap: 20, paddingBottom: 120 }}>
      <PageHeader title="Personal information" subtitle="Edit your details and save changes" />

      <View className="items-center gap-xs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={changeAvatar}
          disabled={avatarUpload.isPending}
          className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-light"
        >
          {avatarUpload.isPending ? (
            <ActivityIndicator color={colors.gray[500]} />
          ) : user?.image ? (
            <Image
              source={{ uri: user.image }}
              style={{ width: 96, height: 96 }}
              contentFit="cover"
              transition={150}
            />
          ) : initialsFrom(user?.name ?? "") ? (
            <Text variant="heading3" color="muted">
              {initialsFrom(user?.name ?? "")}
            </Text>
          ) : (
            <Camera size={28} color={colors.gray[500]} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={changeAvatar}
          disabled={avatarUpload.isPending}
          hitSlop={8}
        >
          <Text variant="label" color="muted">
            Change photo
          </Text>
        </Pressable>
      </View>

      <Input label="Full name" value={fullName} onChangeText={setFullName} />
      <Input label="Email" value={user?.email ?? ""} editable={false} />

      <SelectInput
        accessibilityRole="button"
        accessibilityLabel="Select goal"
        onPress={() => setEditingSelect("goal")}
        label="Goal"
        value={GOAL_LABELS[goal]}
      />

      <Input
        label="Current weight"
        value={currentWeight}
        onChangeText={setCurrentWeight}
        keyboardType="decimal-pad"
        trailingText={weightUnit}
      />
      <Input
        label="Target weight"
        value={targetWeight}
        onChangeText={setTargetWeight}
        keyboardType="decimal-pad"
        trailingText={weightUnit}
      />
      <Input
        label="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        trailingText="years"
      />

      <Input
        label="Height"
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
        trailingText={heightUnit}
      />

      <SelectInput
        accessibilityRole="button"
        accessibilityLabel="Select sex"
        onPress={() => setEditingSelect("sex")}
        label="Sex"
        value={SEX_LABELS[sex]}
      />

      <View className="flex-1" />
      <Button label="Save changes" loading={updateProfile.isPending} onPress={save} />

      <SelectSheet
        title="Goal"
        options={GOAL_OPTIONS}
        value={goal}
        visible={editingSelect === "goal"}
        onChange={setGoal}
        onClose={() => setEditingSelect(null)}
      />
      <SelectSheet
        title="Sex"
        options={SEX_OPTIONS}
        value={sex}
        visible={editingSelect === "sex"}
        onChange={setSex}
        onClose={() => setEditingSelect(null)}
      />
    </Screen>
  );
}
