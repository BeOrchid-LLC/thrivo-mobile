import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Input, Screen, SectionError, SkeletonText, Text } from "@/components";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import type { Mood } from "@/contracts";
import { useCheckins, useCreateCheckin } from "../hooks/useCheckin";

// Order high → low so the row reads like a mood scale. Values match the backend enum.
const moods: { value: Mood; emoji: string; label: string }[] = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "ok", emoji: "😐", label: "Okay" },
  { value: "low", emoji: "😕", label: "Low" },
  { value: "bad", emoji: "😞", label: "Bad" },
];

const moodLabel = (mood: Mood): string => moods.find((m) => m.value === mood)?.label ?? mood;

export function CheckinScreen() {
  const router = useRouter();
  const day = useCurrentDay();
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const create = useCreateCheckin();
  const history = useCheckins();

  const submitted = create.data?.checkin;
  const todayDone = (history.data ?? []).some((c) => c.day === day) || submitted?.day === day;

  const submit = () => {
    if (!mood) return;
    const trimmed = note.trim();
    create.mutate({ mood, day, note: trimmed.length > 0 ? trimmed : undefined });
  };

  return (
    <Screen scroll style={{ gap: 24 }}>
      <View className="gap-xs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
        >
          <Text variant="heading2" color="dark">
            Daily check-in
          </Text>
        </Pressable>
        <Text variant="body" color="muted">
          How are you feeling today? A quick check-in keeps your streak alive.
        </Text>
      </View>

      {submitted ? (
        <Card className="gap-md bg-primarySoft">
          <Text variant="heading3" color="dark">
            Thanks for checking in — feeling {moodLabel(submitted.mood).toLowerCase()}.
          </Text>
          {submitted.tip ? (
            <View className="gap-xs">
              <Text variant="caption" color="primary" className="font-semibold">
                Thrivo Tip
              </Text>
              <Text variant="body" color="dark">
                {submitted.tip}
              </Text>
            </View>
          ) : null}
          <Button label="Back to dashboard" onPress={() => router.replace("/(app)/dashboard")} />
        </Card>
      ) : (
        <View className="gap-xl">
          <View className="gap-md">
            <Text variant="heading3" color="dark">
              Your mood
            </Text>
            <View className="flex-row justify-between">
              {moods.map((option) => {
                const selected = option.value === mood;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                    onPress={() => setMood(option.value)}
                    className={`min-h-[72px] flex-1 items-center justify-center gap-xs rounded-md py-sm ${
                      selected ? "bg-primarySoft" : "bg-gray-100"
                    }`}
                  >
                    <Text variant="heading2">{option.emoji}</Text>
                    <Text variant="caption" color={selected ? "primary" : "muted"}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label="Anything on your mind? (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="A note to your future self…"
            multiline
            maxLength={500}
          />

          {todayDone ? (
            <Text variant="caption" color="muted">
              You already checked in today — logging again updates it.
            </Text>
          ) : null}

          {create.isError ? (
            <SectionError
              title="Could not save your check-in"
              message="Check your connection and try again."
              onRetry={submit}
              className="border-0 p-0"
            />
          ) : null}

          <Button
            label="Save check-in"
            loading={create.isPending}
            disabled={!mood}
            onPress={submit}
          />
        </View>
      )}

      <View className="gap-md">
        <Text variant="heading3" color="muted">
          Recent check-ins
        </Text>
        {history.isLoading ? (
          <View className="gap-sm">
            <SkeletonText className="w-2/3" />
            <SkeletonText className="w-1/2" />
          </View>
        ) : history.isError ? (
          <SectionError
            title="Could not load history"
            message="Your past check-ins are unavailable right now."
            onRetry={() => void history.refetch()}
          />
        ) : (history.data ?? []).length === 0 ? (
          <Text variant="body" color="muted">
            No check-ins yet. Today is a great day to start.
          </Text>
        ) : (
          (history.data ?? []).map((checkin) => (
            <View
              key={checkin.id}
              className="flex-row items-center justify-between border-b border-gray-200 py-sm"
            >
              <View className="flex-1 pr-md">
                <Text variant="body" color="dark">
                  {moods.find((m) => m.value === checkin.mood)?.emoji ?? "•"}{" "}
                  {moodLabel(checkin.mood)}
                </Text>
                {checkin.note ? (
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {checkin.note}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" color="muted">
                {checkin.day}
              </Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
