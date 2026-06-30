import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { CaretDown, Camera } from "phosphor-react-native";
import { BackButton, Button, Input, Screen, Text } from "@/components";
import type { Goal, Sex, UpdateProfilePayload } from "@/contracts";
import {
  FileTooLargeError,
  formatBytes,
  useAvatarUpload,
  useMe,
  useUpdateProfile,
} from "@/features/profile";
import { colors } from "@/theme";

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

const SEX_LABELS: Record<Sex, string> = {
  female: "Female",
  male: "Male",
  prefer_not_to_say: "Prefer not to say",
};

const SEX_ORDER: Sex[] = ["female", "male", "prefer_not_to_say"];

function nextValue<T extends string>(values: T[], value: T | null | undefined, fallback: T): T {
  const current = value ?? fallback;
  const index = values.indexOf(current);
  return values[(index + 1) % values.length] ?? fallback;
}

function numberText(value: string | null | undefined) {
  return value ? String(Number.parseFloat(value)) : "";
}

function parsePositive(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function PersonalInfoScreen() {
  const profile = useMe();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useAvatarUpload();
  const user = profile.data;

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
  const [sex, setSex] = useState<Sex>("female");

  useEffect(() => {
    if (!user) return;
    setFullName(user.name);
    setGoal(user.goal ?? "lose");
    setCurrentWeight(numberText(user.weightKg));
    setTargetWeight(numberText(user.targetWeightKg));
    setHeight(numberText(user.heightCm));
    setSex(user.sex ?? "female");
  }, [user]);

  const save = () => {
    const payload: UpdateProfilePayload = {
      firstName: fullName.trim(),
      goal,
      sex,
      currentWeightKg: parsePositive(currentWeight),
      targetWeightKg: parsePositive(targetWeight),
      heightCm: parsePositive(height),
    };

    updateProfile.mutate(payload, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <Screen scroll backgroundColor={colors.white} style={{ gap: 20, paddingBottom: 120 }}>
      <View className="flex-row items-center gap-md">
        <BackButton onPress={() => router.back()} />
        <Text variant="heading2">Personal information</Text>
      </View>
      <Text color="muted" className="text-[16px]">
        Edit your details and save changes
      </Text>

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
            <Text variant="heading2" color="muted">
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
          <Text color="muted" className="text-[14px]">
            Change photo
          </Text>
        </Pressable>
      </View>

      <Input label="Full name" value={fullName} onChangeText={setFullName} />
      <Input label="Email" value={user?.email ?? ""} editable={false} />

      <Pressable
        accessibilityRole="button"
        onPress={() => setGoal((value) => nextValue(GOAL_ORDER, value, "lose"))}
        className="gap-xs"
      >
        <Text variant="caption" color="muted" className="ml-xs">
          Goal
        </Text>
        <View className="min-h-[52px] flex-row items-center justify-between rounded-md bg-light px-lg">
          <Text>{GOAL_LABELS[goal]}</Text>
          <CaretDown size={20} color={colors.gray[500]} />
        </View>
      </Pressable>

      <Input
        label="Current weight"
        value={currentWeight}
        onChangeText={setCurrentWeight}
        keyboardType="decimal-pad"
        trailingText="kg"
      />
      <Input
        label="Target weight"
        value={targetWeight}
        onChangeText={setTargetWeight}
        keyboardType="decimal-pad"
        trailingText="kg"
      />
      <Input
        label="Height"
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
        trailingText="cm"
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => setSex((value) => nextValue(SEX_ORDER, value, "female"))}
        className="gap-xs"
      >
        <Text variant="caption" color="muted" className="ml-xs">
          Sex
        </Text>
        <View className="min-h-[52px] justify-center rounded-md bg-light px-lg">
          <Text color={sex === "prefer_not_to_say" ? "muted" : "dark"}>{SEX_LABELS[sex]}</Text>
        </View>
      </Pressable>

      <View className="flex-1" />
      <Button label="Save changes" loading={updateProfile.isPending} onPress={save} />
    </Screen>
  );
}
